import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GenerarLinkPagoDto } from './dto/generar-link-pago.dto';
import { obtenerProvider } from '../../mantenedores/pasarelas-pago/providers/registry';
import { calcularAbonado, calcularMontoImpuesto, calcularSaldoPendiente, desglosePorMoneda } from '../../../common/utils/reserva-montos.util';
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

    const saldoEnMoneda = saldoActual.find((s) => s.monedaId === monedaId);
    const monto = dto.monto ?? saldoEnMoneda?.total;
    if (monto === undefined) {
      throw new BadRequestException('No se pudo determinar el monto del link de pago: indícalo manualmente');
    }
    if (monto <= 0) throw new BadRequestException('El monto del link de pago debe ser mayor a cero');
    if (saldoEnMoneda && monto > saldoEnMoneda.total + 0.01) {
      throw new BadRequestException(
        `El monto (${monto}) supera el saldo pendiente (${saldoEnMoneda.total.toFixed(2)} ${moneda.codigo})`,
      );
    }

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
