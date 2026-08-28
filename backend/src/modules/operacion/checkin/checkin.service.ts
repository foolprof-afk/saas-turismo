import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QrTokenService } from '../../comercial/vouchers/qr-token.service';

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokenService: QrTokenService,
  ) {}

  /** Resuelve cuál ItinerarioServicio de la reserva corresponde a "ahora" (o al indicado explícitamente). */
  private async resolverServicioDelDia(reservaId: string, itinerarioServicioId?: string) {
    if (itinerarioServicioId) {
      const item = await this.prisma.itinerarioServicio.findFirst({
        where: { id: itinerarioServicioId, dia: { itinerario: { reservaId } } },
      });
      if (!item) throw new NotFoundException('El servicio indicado no pertenece a esta reserva');
      return item;
    }

    const hoy = new Date();
    const inicioDia = new Date(new Date(hoy).setHours(0, 0, 0, 0));
    const finDia = new Date(new Date(hoy).setHours(23, 59, 59, 999));

    const candidatos = await this.prisma.itinerarioServicio.findMany({
      where: {
        dia: { itinerario: { reservaId }, fecha: { gte: inicioDia, lte: finDia } },
        estado: 'PENDIENTE',
      },
      orderBy: { horaInicio: 'asc' },
    });

    if (candidatos.length === 0) {
      throw new NotFoundException('No hay servicios pendientes para hoy en esta reserva');
    }
    // Si hay más de uno, se resuelve el más próximo por hora; casos ambiguos deben pasar itinerarioServicioId.
    return candidatos[0];
  }

  private async ejecutarCheckin(
    reservaId: string,
    usuarioOperacionId: string,
    metodo: 'QR' | 'MANUAL',
    itinerarioServicioId?: string,
  ) {
    const servicio = await this.resolverServicioDelDia(reservaId, itinerarioServicioId);

    if (servicio.estado === 'COMPLETADO') {
      throw new ConflictException('Este servicio ya fue operado');
    }
    if (servicio.estado === 'CANCELADO') {
      throw new ConflictException('Este servicio fue cancelado');
    }

    return this.prisma.$transaction(async (tx) => {
      const checkin = await tx.checkIn.create({
        data: { itinerarioServicioId: servicio.id, usuarioOperacionId, metodo },
      });
      await tx.itinerarioServicio.update({
        where: { id: servicio.id },
        data: { estado: 'COMPLETADO' },
      });
      return tx.checkIn.findUnique({
        where: { id: checkin.id },
        include: { itinerarioServicio: { include: { servicio: true } } },
      });
    });
  }

  async scan(token: string, usuarioOperacionId: string, itinerarioServicioId?: string) {
    const payload = this.qrTokenService.verify(token);
    return this.ejecutarCheckin(payload.sub, usuarioOperacionId, 'QR', itinerarioServicioId);
  }

  async manual(agenciaId: string, codigoReserva: string, usuarioOperacionId: string, itinerarioServicioId?: string) {
    const reserva = await this.prisma.reserva.findFirst({ where: { codigoReserva, agenciaId } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    return this.ejecutarCheckin(reserva.id, usuarioOperacionId, 'MANUAL', itinerarioServicioId);
  }
}
