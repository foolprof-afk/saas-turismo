import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GenerarLinkPagoDto } from './dto/generar-link-pago.dto';
import { obtenerProvider } from '../../mantenedores/pasarelas-pago/providers/registry';
import {
  calcularAbonado,
  calcularMontoImpuesto,
  calcularSaldoPendiente,
  convertirAPrincipal,
  convertirMonto,
  desglosePorMoneda,
  MonedaPrincipalInfo,
  MontoPorMoneda,
} from '../../../common/utils/reserva-montos.util';
import { normalizarCodigoIso } from '../../../common/utils/moneda-iso.util';

const INCLUDE_ITINERARIO_MONTOS = {
  dias: { include: { servicios: { include: { moneda: true } } } },
} as const;

/**
 * Genera links de pago (checkout de una pasarela como Recurrente) para una reserva y procesa
 * la confirmación que llega por webhook, registrando el Pago automáticamente. Ver
 * ReservasService.confirmar para el flujo manual equivalente que sirvió de referencia.
 */
@Injectable()
export class LinksPagoService {
  constructor(private readonly prisma: PrismaService) {}

  findByReserva(agenciaId: string, reservaId: string) {
    return this.prisma.linkPago.findMany({
      where: { reservaId, agenciaId },
      include: { pasarelaPago: { select: { nombre: true, proveedor: true } }, moneda: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generar(agenciaId: string, reservaId: string, dto: GenerarLinkPagoDto) {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id: reservaId, agenciaId },
      include: { moneda: true, itinerario: { include: INCLUDE_ITINERARIO_MONTOS }, pagos: { include: { moneda: true } } },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede generar un link de pago para una reserva cancelada');
    }

    const pasarela = dto.pasarelaPagoId
      ? await this.prisma.pasarelaPago.findFirst({ where: { id: dto.pasarelaPagoId, agenciaId, activo: true } })
      : await this.buscarPasarelaUnica(agenciaId);
    if (!pasarela) {
      throw new BadRequestException(
        dto.pasarelaPagoId ? 'Pasarela de pago no encontrada o inactiva' : 'No hay una pasarela de pago activa configurada',
      );
    }
    const provider = obtenerProvider(pasarela.proveedor);
    if (!provider) throw new BadRequestException(`Proveedor de pasarela de pago desconocido: ${pasarela.proveedor}`);

    const montosReserva = desglosePorMoneda(reserva);
    const abonadoActual = calcularAbonado(reserva.pagos);
    const saldoActual = calcularSaldoPendiente(montosReserva, abonadoActual);

    const monedaId =
      dto.monedaId ?? reserva.monedaId ?? (montosReserva.length === 1 ? montosReserva[0].monedaId : undefined);
    if (!monedaId) {
      throw new BadRequestException(
        'Esta reserva incluye servicios en distintas monedas: indica la moneda del link de pago',
      );
    }
    const moneda = await this.prisma.moneda.findFirst({ where: { id: monedaId, agenciaId } });
    if (!moneda) throw new NotFoundException('Moneda no encontrada');
    const codigoIso = normalizarCodigoIso(moneda.codigo);
    if (!provider.monedasSoportadas.includes(codigoIso)) {
      throw new BadRequestException(
        `La pasarela ${pasarela.nombre} no admite pagos en ${moneda.codigo} (monedas admitidas: ${provider.monedasSoportadas.join(', ')})`,
      );
    }

    // Igual que en ReservasService.confirmar: el saldo por defecto se calcula sobre el total
    // completo de la reserva (todas sus monedas), no fraccionado por la moneda de este link en
    // particular, para no subestimar lo que falta cuando hay servicios/abonos en más de una
    // moneda. Tampoco se valida que el monto no supere ese saldo: se permite cobrar de más
    // (impuestos u otros cargos adicionales no reflejados en los servicios de la reserva).
    const monedaPrincipal = await this.obtenerMonedaPrincipal(agenciaId);
    const saldoEnMonedaPago = this.saldoPendienteConvertido(saldoActual, monedaPrincipal, {
      id: moneda.id,
      codigo: moneda.codigo,
      simbolo: moneda.simbolo,
      tasaCambio: Number(moneda.tasaCambio),
    });
    const monto = dto.monto ?? saldoEnMonedaPago;
    if (monto === undefined) {
      throw new BadRequestException('No se pudo determinar el monto del link de pago: indícalo manualmente');
    }
    if (monto <= 0) throw new BadRequestException('El monto del link de pago debe ser mayor a cero');

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const config = (pasarela.config as Record<string, unknown>) ?? {};
    const successUrl = (config.successUrl as string) || `${frontendUrl}/reservas/${reservaId}`;
    const cancelUrl = (config.cancelUrl as string) || `${frontendUrl}/reservas/${reservaId}`;

    const linkPago = await this.prisma.linkPago.create({
      data: { agenciaId, reservaId, pasarelaPagoId: pasarela.id, monedaId, monto, urlPago: '', estado: 'PENDIENTE' },
    });
    try {
      const { referenciaExterna, urlPago } = await provider.crearCheckout({
        urlBase: pasarela.urlBase ?? '',
        config,
        monto,
        monedaCodigo: codigoIso,
        descripcion: `Reserva ${reserva.codigoReserva}`,
        referenciaInterna: linkPago.id,
        successUrl,
        cancelUrl,
      });
      return this.prisma.linkPago.update({ where: { id: linkPago.id }, data: { referenciaExterna, urlPago } });
    } catch (err) {
      await this.prisma.linkPago.delete({ where: { id: linkPago.id } });
      throw err;
    }
  }

  /** Si la agencia solo tiene una pasarela activa, se usa por defecto sin tener que elegirla. */
  private async buscarPasarelaUnica(agenciaId: string) {
    const activas = await this.prisma.pasarelaPago.findMany({ where: { agenciaId, activo: true } });
    return activas.length === 1 ? activas[0] : null;
  }

  /** Igual que ReservasService.obtenerMonedaPrincipal: moneda marcada como principal de la agencia. */
  private async obtenerMonedaPrincipal(agenciaId: string): Promise<MonedaPrincipalInfo | null> {
    const moneda = await this.prisma.moneda.findFirst({ where: { agenciaId, esPrincipal: true } });
    if (!moneda) return null;
    return { id: moneda.id, codigo: moneda.codigo, simbolo: moneda.simbolo, tasaCambio: Number(moneda.tasaCambio) };
  }

  /**
   * Igual que ReservasService.saldoPendienteConvertido: convierte el saldo pendiente TOTAL de
   * una reserva (todas sus monedas) a una moneda de destino específica, usando la moneda
   * principal de la agencia como puente. Si no hay moneda principal configurada, cae de vuelta
   * al saldo de esa moneda en particular, si existe.
   */
  private saldoPendienteConvertido(
    saldo: MontoPorMoneda[],
    monedaPrincipal: MonedaPrincipalInfo | null,
    destino: MonedaPrincipalInfo,
  ): number | undefined {
    if (!monedaPrincipal) {
      return saldo.find((s) => s.monedaId === destino.id)?.total;
    }
    const totalPrincipal = convertirAPrincipal(saldo, monedaPrincipal)?.total ?? 0;
    return convertirMonto(totalPrincipal, monedaPrincipal.tasaCambio, destino.tasaCambio);
  }

  /**
   * Cancela manualmente un link de pago que quedó PENDIENTE pero ya no corresponde cobrarlo
   * (ej. el cliente pagó por otro medio y se registró un abono manual, o el checkout quedó
   * abandonado). Solo se puede cancelar un link que nunca se pagó: uno ya PAGADO no se toca acá
   * para no perder el registro contable (eso se maneja aparte, como reembolso/ajuste).
   */
  async cancelar(agenciaId: string, reservaId: string, id: string) {
    const link = await this.prisma.linkPago.findFirst({ where: { id, reservaId, agenciaId } });
    if (!link) throw new NotFoundException('Link de pago no encontrado');
    if (link.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se puede cancelar un link de pago que esté pendiente');
    }
    return this.prisma.linkPago.update({ where: { id }, data: { estado: 'CANCELADO' } });
  }

  /**
   * Procesa el webhook de confirmación de pago de una pasarela: verifica la firma, ubica el
   * LinkPago correspondiente y registra el Pago automáticamente (mismo patrón transaccional que
   * ReservasService.confirmar). Es idempotente: si el link ya está PAGADO, no hace nada más.
   */
  async procesarWebhook(pasarelaPagoId: string, headers: Record<string, string | string[] | undefined>, rawBody: string) {
    const pasarela = await this.prisma.pasarelaPago.findUnique({ where: { id: pasarelaPagoId } });
    if (!pasarela) throw new NotFoundException('Pasarela de pago no encontrada');
    const provider = obtenerProvider(pasarela.proveedor);
    if (!provider) throw new BadRequestException(`Proveedor de pasarela de pago desconocido: ${pasarela.proveedor}`);

    const resultado = provider.verificarWebhook({ headers, rawBody, config: (pasarela.config as Record<string, unknown>) ?? {} });
    if (!resultado) throw new BadRequestException('Firma de webhook inválida');

    const linkPago = resultado.referenciaInterna
      ? await this.prisma.linkPago.findFirst({ where: { id: resultado.referenciaInterna, pasarelaPagoId } })
      : await this.prisma.linkPago.findFirst({
          where: { pasarelaPagoId, referenciaExterna: resultado.referenciaExterna },
        });
    if (!linkPago) return { ignorado: true };
    if (linkPago.estado === 'PAGADO') return { ignorado: true, yaProcesado: true };

    const montoEsperado = Number(linkPago.monto);
    if (Math.abs(resultado.monto - montoEsperado) > 0.01) {
      throw new BadRequestException('El monto confirmado por el webhook no coincide con el link de pago');
    }

    const formaPago = await this.prisma.formaPago.findUnique({ where: { id: pasarela.formaPagoId } });
    const montoImpuesto = calcularMontoImpuesto((formaPago?.config as { impuestoPorcentaje?: number })?.impuestoPorcentaje, montoEsperado);

    const [pago] = await this.prisma.$transaction([
      this.prisma.pago.create({
        data: {
          reservaId: linkPago.reservaId,
          formaPagoId: pasarela.formaPagoId,
          monto: montoEsperado,
          montoImpuesto,
          monedaId: linkPago.monedaId,
          referenciaExterna: resultado.referenciaExterna,
          estado: 'PAGADO',
        },
      }),
      this.prisma.reserva.update({
        where: { id: linkPago.reservaId },
        data: { estado: 'CONFIRMADA', formaPagoId: pasarela.formaPagoId },
      }),
    ]);
    await this.prisma.linkPago.update({ where: { id: linkPago.id }, data: { estado: 'PAGADO', pagoId: pago.id } });

    return { success: true };
  }
}
