import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async comercial(agenciaId: string) {
    const [reservasPendientes, reservasConfirmadas, reservasHoy] = await Promise.all([
      this.prisma.reserva.count({ where: { agenciaId, estado: 'PENDIENTE' } }),
      this.prisma.reserva.count({ where: { agenciaId, estado: 'CONFIRMADA' } }),
      this.prisma.reserva.count({
        where: {
          agenciaId,
          fechaServicioInicio: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    return { reservasPendientes, reservasConfirmadas, reservasHoy };
  }

  async operacion(agenciaId: string) {
    const hoy = new Date();
    const inicioDia = new Date(new Date(hoy).setHours(0, 0, 0, 0));
    const finDia = new Date(new Date(hoy).setHours(23, 59, 59, 999));

    const [pendientesHoy, completadosHoy] = await Promise.all([
      this.prisma.itinerarioServicio.count({
        where: {
          estado: 'PENDIENTE',
          dia: { fecha: { gte: inicioDia, lte: finDia }, itinerario: { reserva: { agenciaId } } },
        },
      }),
      this.prisma.itinerarioServicio.count({
        where: {
          estado: 'COMPLETADO',
          dia: { fecha: { gte: inicioDia, lte: finDia }, itinerario: { reserva: { agenciaId } } },
        },
      }),
    ]);
    return { pendientesHoy, completadosHoy };
  }

  async finanzas(agenciaId: string) {
    const [totalReservado, liquidacionesPendientes] = await Promise.all([
      this.prisma.reserva.aggregate({
        where: { agenciaId, estado: { not: 'CANCELADA' } },
        _sum: { total: true },
      }),
      this.prisma.liquidacion.count({
        where: { estado: 'PENDIENTE', proveedor: { agenciaId } },
      }),
    ]);
    return {
      totalReservado: totalReservado._sum.total ?? 0,
      liquidacionesPendientes,
    };
  }
}
