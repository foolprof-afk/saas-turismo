import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

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

    return this.prisma.pago.create({
      data: { reservaId, ...data, estado: 'PAGADO' },
    });
  }
}
