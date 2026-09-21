import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOrdenServicioDto, OrdenServicioItemDto } from './dto/create-orden-servicio.dto';
import { FiltrosOrdenServicioDto } from './dto/filtros-orden-servicio.dto';

const INCLUDE_ORDEN = {
  proveedor: true,
  usuario: { select: { nombre: true, cliente: { select: { logoUrl: true } } } },
  agencia: { select: { nombre: true, razonSocial: true, rutONit: true, logoUrl: true } },
  items: { include: { servicio: true, moneda: true } },
} satisfies Prisma.OrdenServicioInclude;

/**
 * Ordenes de servicio: documento independiente de Reserva/Cotizacion que la agencia emite
 * hacia un proveedor pidiéndole ejecutar uno o más de sus servicios a un precio costo pactado.
 * No reserva capacidad ni compromete a ningún cliente; es solo el respaldo/orden de compra que
 * se envía al proveedor (ver documento imprimible en el frontend).
 */
@Injectable()
export class OrdenesServicioService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(agenciaId: string, filtros: FiltrosOrdenServicioDto) {
    const where: Prisma.OrdenServicioWhereInput = { agenciaId };
    if (filtros.proveedorId) where.proveedorId = filtros.proveedorId;
    if (filtros.codigoOrden) where.codigoOrden = { contains: filtros.codigoOrden, mode: 'insensitive' };
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.items = {
        some: {
          fechaServicio: {
            ...(filtros.fechaDesde ? { gte: new Date(filtros.fechaDesde) } : {}),
            ...(filtros.fechaHasta ? { lte: new Date(filtros.fechaHasta) } : {}),
          },
        },
      };
    }
    return this.prisma.ordenServicio.findMany({
      where,
      include: INCLUDE_ORDEN,
      skip: filtros.skip,
      take: filtros.limit,
      orderBy: { fechaEmision: 'desc' },
    });
  }

  async findOne(agenciaId: string, id: string) {
    const orden = await this.prisma.ordenServicio.findFirst({ where: { id, agenciaId }, include: INCLUDE_ORDEN });
    if (!orden) throw new NotFoundException('Orden de servicio no encontrada');
    return orden;
  }

  private generarCodigoOrden(): string {
    return `OS-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Valida que cada item pertenezca a un servicio de la agencia y del proveedor seleccionado
   * (una orden se emite a UN proveedor; no tendría sentido mezclar servicios de otros), y
   * congela precioCosto/monedaId tomándolos del servicio salvo que se haya indicado un
   * precioCosto manual para esa orden puntual.
   */
  private async construirItems(agenciaId: string, proveedorId: string, items: OrdenServicioItemDto[]) {
    const servicioIds = items.map((i) => i.servicioId);
    const servicios = await this.prisma.servicio.findMany({ where: { id: { in: servicioIds }, agenciaId } });

    return items.map((item) => {
      const servicio = servicios.find((s) => s.id === item.servicioId);
      if (!servicio) throw new NotFoundException(`Servicio ${item.servicioId} no encontrado`);
      if (servicio.proveedorId !== proveedorId) {
        throw new BadRequestException(`El servicio "${servicio.nombre}" no pertenece al proveedor seleccionado`);
      }
      const precioCosto = item.precioCosto ?? (servicio.precioCosto !== null ? Number(servicio.precioCosto) : null);
      if (precioCosto === null) {
        throw new BadRequestException(
          `El servicio "${servicio.nombre}" no tiene precio costo definido; indícalo manualmente en la orden`,
        );
      }
      return {
        servicioId: servicio.id,
        cantidad: item.cantidad,
        precioCosto,
        monedaId: servicio.monedaId,
        fechaServicio: new Date(item.fechaServicio),
      };
    });
  }

  async create(agenciaId: string, usuarioId: string, dto: CreateOrdenServicioDto) {
    const proveedor = await this.prisma.proveedor.findFirst({ where: { id: dto.proveedorId, agenciaId } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');

    const items = await this.construirItems(agenciaId, proveedor.id, dto.items);

    return this.prisma.ordenServicio.create({
      data: {
        agenciaId,
        proveedorId: proveedor.id,
        usuarioId,
        codigoOrden: this.generarCodigoOrden(),
        notas: dto.notas,
        items: { create: items },
      },
      include: INCLUDE_ORDEN,
    });
  }

  async anular(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.ordenServicio.update({ where: { id }, data: { estado: 'ANULADA' } });
  }

  async eliminar(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.ordenServicio.delete({ where: { id } });
  }
}
