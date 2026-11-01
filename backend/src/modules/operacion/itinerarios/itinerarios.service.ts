import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ItinerariosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agenda operativa del día (lo que hay que despachar): todos los ItinerarioServicio
   * programados para una fecha. Filtrable por usuario/vendedor (vendedorIds), útil para
   * ver qué reservó cada agente.
   */
  async findPorFecha(agenciaId: string, fecha: string, vendedorIds?: string[]) {
    const dia = new Date(fecha);
    const inicioDia = new Date(dia.setHours(0, 0, 0, 0));
    const finDia = new Date(dia.setHours(23, 59, 59, 999));

    const agenda = await this.prisma.itinerarioServicio.findMany({
      where: {
        dia: {
          fecha: { gte: inicioDia, lte: finDia },
          itinerario: {
            reserva: {
              agenciaId,
              ...(vendedorIds && vendedorIds.length ? { vendedorId: { in: vendedorIds } } : {}),
            },
          },
        },
      },
      include: {
        servicio: true,
        vehiculo: true,
        guia: true,
        puntoRecogida: true,
        checkin: true,
        dia: {
          include: {
            itinerario: {
              include: { reserva: { include: { cliente: true, vendedor: true, pasajeros: true } } },
            },
          },
        },
      },
      orderBy: { horaInicio: 'asc' },
    });

    // OrdenServicioItem no referencia directamente al ItinerarioServicio (ver schema): para
    // saber qué servicios de la agenda ya tienen una orden de servicio emitida a un proveedor
    // (y a cuál), se matchea por servicio + fecha del día, que es la única relación disponible.
    const servicioIds = Array.from(new Set(agenda.map((i) => i.servicioId)));
    const ordenesItems = servicioIds.length
      ? await this.prisma.ordenServicioItem.findMany({
          where: {
            servicioId: { in: servicioIds },
            fechaServicio: { gte: inicioDia, lte: finDia },
            ordenServicio: { agenciaId, estado: { not: 'ANULADA' } },
          },
          include: { ordenServicio: { include: { proveedor: true } } },
        })
      : [];
    const proveedorPorServicio = new Map(ordenesItems.map((oi) => [oi.servicioId, oi.ordenServicio.proveedor.nombre]));

    return agenda.map((item) => ({
      ...item,
      proveedorOrdenServicio: proveedorPorServicio.get(item.servicioId) ?? null,
    }));
  }

  findByReserva(agenciaId: string, reservaId: string) {
    return this.prisma.itinerario.findFirst({
      where: { reservaId, reserva: { agenciaId } },
      include: { dias: { include: { servicios: { include: { servicio: true, checkin: true } } }, orderBy: { numeroDia: 'asc' } } },
    });
  }
}
