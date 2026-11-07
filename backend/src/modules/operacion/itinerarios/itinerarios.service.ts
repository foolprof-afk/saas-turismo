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
              // Despacho del día: solo reservas confirmadas y con al menos un pago registrado
              // (lo que realmente se va a operar con los proveedores/operadores). Las canceladas
              // y las pendientes (sin confirmar/sin abono) no deben aparecer acá.
              estado: 'CONFIRMADA',
              pagos: { some: {} },
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
    // Se incluyen también las órdenes ANULADAS: antes se excluían y el servicio quedaba sin
    // ningún dato de orden en la agenda, como si nunca se hubiera emitido una (ver frontend,
    // que la muestra tachada/en rojo en vez de ocultarla).
    const ordenesItems = servicioIds.length
      ? await this.prisma.ordenServicioItem.findMany({
          where: {
            servicioId: { in: servicioIds },
            fechaServicio: { gte: inicioDia, lte: finDia },
            ordenServicio: { agenciaId },
          },
          include: { ordenServicio: { include: { proveedor: true } } },
          orderBy: { ordenServicio: { estado: 'asc' } }, // ANULADA > EMITIDA/PAGADA alfabéticamente, así la vigente gana el Map si hay varias
        })
      : [];
    const ordenPorServicio = new Map(
      ordenesItems.map((oi) => [
        oi.servicioId,
        {
          id: oi.ordenServicio.id,
          codigoOrden: oi.ordenServicio.codigoOrden,
          proveedor: oi.ordenServicio.proveedor.nombre,
          estado: oi.ordenServicio.estado,
        },
      ]),
    );

    return agenda.map((item) => {
      const orden = ordenPorServicio.get(item.servicioId) ?? null;
      return {
        ...item,
        proveedorOrdenServicio: orden?.proveedor ?? null,
        ordenServicio: orden ? { id: orden.id, codigoOrden: orden.codigoOrden, estado: orden.estado } : null,
      };
    });
  }

  findByReserva(agenciaId: string, reservaId: string) {
    return this.prisma.itinerario.findFirst({
      where: { reservaId, reserva: { agenciaId } },
      include: { dias: { include: { servicios: { include: { servicio: true, checkin: true } } }, orderBy: { numeroDia: 'asc' } } },
    });
  }
}
