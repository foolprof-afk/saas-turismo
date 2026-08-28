import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LiquidacionesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(agenciaId: string) {
    return this.prisma.liquidacion.findMany({
      where: { proveedor: { agenciaId } },
      include: { proveedor: true },
      orderBy: { periodoInicio: 'desc' },
    });
  }

  /**
   * Genera una liquidación agrupando los ItinerarioServicio en estado COMPLETADO
   * de un proveedor dentro del periodo, que aún no hayan sido liquidados.
   */
  async generar(agenciaId: string, proveedorId: string, periodoInicio: Date, periodoFin: Date) {
    const proveedor = await this.prisma.proveedor.findFirst({ where: { id: proveedorId, agenciaId } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');

    const serviciosCompletados = await this.prisma.itinerarioServicio.findMany({
      where: {
        estado: 'COMPLETADO',
        servicio: { proveedorId },
        dia: { fecha: { gte: periodoInicio, lte: periodoFin } },
        liquidacionDetalles: { none: {} },
      },
      include: { servicio: true },
    });

    if (serviciosCompletados.length === 0) {
      throw new NotFoundException('No hay servicios completados sin liquidar en el periodo indicado');
    }

    const total = serviciosCompletados.reduce((acc, item) => acc + Number(item.servicio.precioBase), 0);

    return this.prisma.liquidacion.create({
      data: {
        proveedorId,
        periodoInicio,
        periodoFin,
        total,
        detalles: {
          create: serviciosCompletados.map((item) => ({
            itinerarioServicioId: item.id,
            monto: item.servicio.precioBase,
          })),
        },
      },
      include: { detalles: true },
    });
  }

  async marcarPagada(agenciaId: string, id: string) {
    const liquidacion = await this.prisma.liquidacion.findFirst({
      where: { id, proveedor: { agenciaId } },
    });
    if (!liquidacion) throw new NotFoundException('Liquidación no encontrada');

    return this.prisma.liquidacion.update({
      where: { id },
      data: { estado: 'PAGADA', fechaPago: new Date() },
    });
  }
}
