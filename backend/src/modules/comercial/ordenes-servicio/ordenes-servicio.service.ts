import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOrdenServicioDto, OrdenServicioItemDto } from './dto/create-orden-servicio.dto';
import { UpdateOrdenServicioDto } from './dto/update-orden-servicio.dto';
import { FiltrosOrdenServicioDto } from './dto/filtros-orden-servicio.dto';

const INCLUDE_ORDEN = {
  proveedor: true,
  usuario: { select: { nombre: true, cliente: { select: { logoUrl: true } } } },
  agencia: { select: { nombre: true, razonSocial: true, rutONit: true, logoUrl: true } },
  items: { include: { servicio: true, moneda: true } },
  historial: { include: { usuario: { select: { nombre: true } } }, orderBy: { fecha: 'desc' } },
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
   * Valida que cada item pertenezca a un servicio de la agencia, y congela precioCosto/monedaId
   * tomándolos del servicio salvo que se haya indicado un precioCosto manual para esa orden
   * puntual. No se exige que el servicio esté asignado al proveedor de la orden: un mismo
   * servicio puede ser ejecutado por más de un proveedor, así que el proveedor de la orden es
   * independiente del proveedorId "por defecto" que tenga cada Servicio (ver Servicio.proveedorId,
   * que solo sirve como referencia/precio costo por defecto).
   */
  private async construirItems(agenciaId: string, items: OrdenServicioItemDto[]) {
    const servicioIds = items.map((i) => i.servicioId);
    const servicios = await this.prisma.servicio.findMany({ where: { id: { in: servicioIds }, agenciaId } });

    return items.map((item) => {
      const servicio = servicios.find((s) => s.id === item.servicioId);
      if (!servicio) throw new NotFoundException(`Servicio ${item.servicioId} no encontrado`);
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

    const items = await this.construirItems(agenciaId, dto.items);

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

  /**
   * Modifica las líneas/notas de una orden ya emitida, registrando en OrdenServicioHistorial
   * cada línea agregada, quitada o con cantidad/fecha/precio modificados (con el usuario que
   * hizo el cambio), para uso interno. El documento impreso/descargado solo lee items/notas
   * actuales, nunca el historial (ver frontend).
   */
  async actualizar(agenciaId: string, id: string, usuarioId: string, dto: UpdateOrdenServicioDto) {
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id, agenciaId },
      include: { items: { include: { servicio: true } } },
    });
    if (!orden) throw new NotFoundException('Orden de servicio no encontrada');
    if (orden.estado === 'ANULADA') throw new BadRequestException('No se puede modificar una orden anulada');

    const nuevosItems = await this.construirItems(agenciaId, dto.items);

    const servicioIds = Array.from(new Set(dto.items.map((i) => i.servicioId)));
    const servicios = await this.prisma.servicio.findMany({ where: { id: { in: servicioIds }, agenciaId } });
    const nombrePorId = new Map(servicios.map((s) => [s.id, s.nombre]));

    const idsEnviados = new Set(dto.items.filter((i) => i.id).map((i) => i.id as string));
    const historial: { usuarioId: string; descripcion: string }[] = [];

    for (const item of orden.items) {
      if (!idsEnviados.has(item.id)) {
        historial.push({ usuarioId, descripcion: `Se quitó "${item.servicio.nombre}" (cantidad ${item.cantidad})` });
      }
    }

    dto.items.forEach((linea) => {
      const nombre = nombrePorId.get(linea.servicioId) ?? linea.servicioId;
      const actual = linea.id ? orden.items.find((i) => i.id === linea.id) : undefined;
      if (!actual) {
        historial.push({ usuarioId, descripcion: `Se agregó "${nombre}" (cantidad ${linea.cantidad})` });
        return;
      }
      if (actual.cantidad !== linea.cantidad) {
        historial.push({
          usuarioId,
          descripcion: `Se cambió la cantidad de "${nombre}" de ${actual.cantidad} a ${linea.cantidad}`,
        });
      }
      const fechaActual = actual.fechaServicio.toISOString().slice(0, 10);
      if (linea.fechaServicio.slice(0, 10) !== fechaActual) {
        historial.push({
          usuarioId,
          descripcion: `Se cambió la fecha de "${nombre}" de ${fechaActual} a ${linea.fechaServicio.slice(0, 10)}`,
        });
      }
      const precioNuevo = linea.precioCosto ?? Number(actual.precioCosto);
      if (Number(actual.precioCosto) !== precioNuevo) {
        historial.push({
          usuarioId,
          descripcion: `Se cambió el precio costo de "${nombre}" de ${actual.precioCosto} a ${precioNuevo}`,
        });
      }
    });

    await this.prisma.$transaction([
      this.prisma.ordenServicio.update({
        where: { id },
        data: { notas: dto.notas, items: { deleteMany: {}, create: nuevosItems } },
      }),
      ...(historial.length
        ? [this.prisma.ordenServicioHistorial.createMany({ data: historial.map((h) => ({ ...h, ordenServicioId: id })) })]
        : []),
    ]);

    return this.findOne(agenciaId, id);
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
