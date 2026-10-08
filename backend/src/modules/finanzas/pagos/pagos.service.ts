import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { calcularAbonado, calcularSaldoPendiente, desglosePorMoneda } from '../../../common/utils/reserva-montos.util';

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

    const pago = await this.prisma.pago.create({
      data: { reservaId, ...data, estado: 'PAGADO' },
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
