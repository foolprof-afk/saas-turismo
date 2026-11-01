import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  calcularAbonado,
  calcularSaldoPendiente,
  convertirAPrincipal,
  desglosePorMoneda,
  MonedaPrincipalInfo,
  MontoPorMoneda,
} from '../../../common/utils/reserva-montos.util';
import { resolverVendedorIdsPermitidos } from '../../../common/utils/visibilidad.util';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { FiltrosCuadrePagoDto } from './dto/filtros-cuadre-pago.dto';

const INCLUDE_ITINERARIO_MONTOS = {
  dias: { include: { servicios: { include: { moneda: true } } } },
} as const;

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  findByReserva(agenciaId: string, reservaId: string) {
    return this.prisma.pago.findMany({
      where: { reservaId, reserva: { agenciaId } },
      include: { formaPago: true, moneda: true },
      orderBy: { fecha: 'desc' },
    });
  }

  async registrar(
    agenciaId: string,
    reservaId: string,
    usuarioId: string,
    data: {
      formaPagoId: string;
      monto: number;
      monedaId: string;
      referenciaExterna?: string;
      comprobanteUrl?: string;
    },
  ) {
    const reserva = await this.prisma.reserva.findFirst({ where: { id: reservaId, agenciaId } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    const [pago, formaPago, moneda] = await Promise.all([
      this.prisma.pago.create({ data: { reservaId, ...data, estado: 'PAGADO' } }),
      this.prisma.formaPago.findFirst({ where: { id: data.formaPagoId, agenciaId } }),
      this.prisma.moneda.findFirst({ where: { id: data.monedaId, agenciaId } }),
    ]);

    await this.prisma.reservaHistorial.create({
      data: {
        reservaId,
        usuarioId,
        descripcion: `Se registró un abono de ${Number(data.monto).toFixed(2)} ${moneda?.codigo ?? ''} (${formaPago?.nombre ?? 'forma de pago'})`,
      },
    });

    // Un abono registrado a mano (efectivo, transferencia, etc.) es un canal distinto al de los
    // links de pago (checkout de una pasarela, confirmado por webhook). Si ese abono ya cubre el
    // saldo pendiente de la reserva en esa moneda, cualquier link de pago que siga PENDIENTE en
    // la misma moneda queda obsoleto: si el cliente llegara a pagarlo de todas formas, generaría
    // un cobro duplicado. Se cancela automáticamente en vez de dejarlo "pendiente" de forma
    // engañosa (reserva ya pagada mostrando el link como si aún se pudiera pagar).
    await this.cancelarLinksPagoCubiertos(agenciaId, reservaId, data.monedaId);

    return pago;
  }

  private async obtenerMonedaPrincipal(agenciaId: string): Promise<MonedaPrincipalInfo | null> {
    const moneda = await this.prisma.moneda.findFirst({ where: { agenciaId, esPrincipal: true } });
    if (!moneda) return null;
    return { id: moneda.id, codigo: moneda.codigo, simbolo: moneda.simbolo, tasaCambio: Number(moneda.tasaCambio) };
  }

  /**
   * Cuadre de caja: ingresos efectivamente percibidos (pagos en estado PAGADO), agrupados por
   * moneda y por forma de pago. A diferencia de ReservasService.cuadre (que suma el valor total
   * de las reservas, usado para mostrarle al cliente cuánto debe), esto refleja el dinero que
   * realmente entró a caja. Sin fechaInicio/fechaFin se suman todos los pagos, sin límite de
   * rango. El monto considerado incluye montoImpuesto (cargo aparte de la forma de pago): aunque
   * no cuenta como abono al saldo de la reserva (ver calcularAbonado), sí es dinero real cobrado
   * que debe cuadrar en caja.
   */
  async cuadre(agenciaId: string, filtros: FiltrosCuadrePagoDto, user?: AuthenticatedUser) {
    const vendedorIdsPermitidos = user ? await resolverVendedorIdsPermitidos(this.prisma, user) : null;
    const where: Prisma.PagoWhereInput = {
      estado: 'PAGADO',
      reserva: {
        agenciaId,
        ...(vendedorIdsPermitidos ? { vendedorId: { in: vendedorIdsPermitidos } } : {}),
        ...(filtros.codigoReserva ? { codigoReserva: { contains: filtros.codigoReserva, mode: 'insensitive' } } : {}),
      },
    };
    if (filtros.fechaInicio || filtros.fechaFin) {
      where.fecha = {
        ...(filtros.fechaInicio ? { gte: new Date(filtros.fechaInicio) } : {}),
        ...(filtros.fechaFin ? { lte: new Date(`${filtros.fechaFin}T23:59:59.999`) } : {}),
      };
    }

    const [pagos, monedaPrincipal] = await Promise.all([
      this.prisma.pago.findMany({
        where,
        include: {
          moneda: true,
          formaPago: true,
          reserva: { select: { codigoReserva: true, vendedor: { select: { nombre: true } } } },
        },
        orderBy: { fecha: 'asc' },
      }),
      this.obtenerMonedaPrincipal(agenciaId),
    ]);

    const porMonedaFormaPago = new Map<
      string,
      {
        monedaId: string;
        monedaCodigo: string;
        monedaSimbolo: string;
        tasaCambio: number;
        formaPagoId: string;
        formaPagoNombre: string;
        total: number;
        cantidad: number;
      }
    >();
    const porMoneda = new Map<string, MontoPorMoneda & { cantidad: number }>();

    for (const pago of pagos) {
      const montoTotal = Number(pago.monto) + Number(pago.montoImpuesto);

      const claveMF = `${pago.monedaId}:${pago.formaPagoId}`;
      const entryMF = porMonedaFormaPago.get(claveMF) ?? {
        monedaId: pago.monedaId,
        monedaCodigo: pago.moneda.codigo,
        monedaSimbolo: pago.moneda.simbolo,
        tasaCambio: Number(pago.moneda.tasaCambio),
        formaPagoId: pago.formaPagoId,
        formaPagoNombre: pago.formaPago.nombre,
        total: 0,
        cantidad: 0,
      };
      entryMF.total += montoTotal;
      entryMF.cantidad += 1;
      porMonedaFormaPago.set(claveMF, entryMF);

      const entryM = porMoneda.get(pago.monedaId) ?? {
        monedaId: pago.monedaId,
        monedaCodigo: pago.moneda.codigo,
        monedaSimbolo: pago.moneda.simbolo,
        tasaCambio: Number(pago.moneda.tasaCambio),
        total: 0,
        cantidad: 0,
      };
      entryM.total += montoTotal;
      entryM.cantidad += 1;
      porMoneda.set(pago.monedaId, entryM);
    }

    const porMonedaArr = Array.from(porMoneda.values());

    return {
      pagos: pagos.map((p) => ({
        id: p.id,
        fecha: p.fecha,
        monto: p.monto,
        montoImpuesto: p.montoImpuesto,
        codigoReserva: p.reserva.codigoReserva,
        vendedorNombre: p.reserva.vendedor?.nombre ?? null,
        formaPago: { nombre: p.formaPago.nombre },
        moneda: { codigo: p.moneda.codigo, simbolo: p.moneda.simbolo },
      })),
      monedaPrincipal,
      porMoneda: porMonedaArr,
      porMonedaFormaPago: Array.from(porMonedaFormaPago.values()),
      totalGeneral: convertirAPrincipal(porMonedaArr, monedaPrincipal),
    };
  }

  private async cancelarLinksPagoCubiertos(agenciaId: string, reservaId: string, monedaId: string) {
    const linksPendientes = await this.prisma.linkPago.findMany({
      where: { reservaId, agenciaId, monedaId, estado: 'PENDIENTE' },
    });
    if (linksPendientes.length === 0) return;

    const reserva = await this.prisma.reserva.findFirst({
      where: { id: reservaId, agenciaId },
      include: {
        moneda: true,
        itinerario: { include: INCLUDE_ITINERARIO_MONTOS },
        pagos: { include: { moneda: true } },
      },
    });
    if (!reserva) return;

    const montos = desglosePorMoneda(reserva);
    const abonado = calcularAbonado(reserva.pagos);
    const saldo = calcularSaldoPendiente(montos, abonado);
    const saldoEnMoneda = saldo.find((s) => s.monedaId === monedaId)?.total ?? 0;

    if (saldoEnMoneda <= 0.01) {
      await this.prisma.linkPago.updateMany({
        where: { id: { in: linksPendientes.map((l) => l.id) } },
        data: { estado: 'CANCELADO' },
      });
    }
  }
}
