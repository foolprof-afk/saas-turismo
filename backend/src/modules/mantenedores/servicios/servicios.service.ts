import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateServicioDto } from './dto/create-servicio.dto';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  // Servicios asociados: solo los datos mínimos necesarios para mostrarlos en la lista de
  // "servicios asociados" del form de edición y en el bloque "También puedes agregar" del
  // Front Office (ver PRD Guatetur Front Office, sección 5).
  private static readonly INCLUDE_ASOCIACIONES = {
    asociaciones: {
      where: { activo: true },
      orderBy: { orden: 'asc' } as const,
      include: {
        servicioAsociado: {
          select: {
            id: true,
            nombre: true,
            fotoUrl: true,
            precioBase: true,
            duracionMin: true,
            moneda: { select: { codigo: true, simbolo: true } },
          },
        },
      },
    },
  };

  /**
   * 'catalogo_web' (usuario.web, ver PRD Guatetur Front Office) solo debe ver servicios
   * activos y marcados PUBLICO; cualquier otro rol (uso interno del Back Office) ve todos los
   * servicios de la agencia sin filtrar, como hasta ahora.
   */
  private whereCatalogo(agenciaId: string, rol?: string): Prisma.ServicioWhereInput {
    if (rol === 'catalogo_web') {
      return { agenciaId, estado: 'ACTIVO', estadoPublicacion: 'PUBLICO' };
    }
    return { agenciaId };
  }

  findAll(agenciaId: string, skip = 0, take = 20, rol?: string) {
    return this.prisma.servicio.findMany({
      where: this.whereCatalogo(agenciaId, rol),
      include: {
        proveedor: true,
        tipoServicio: true,
        moneda: true,
        impuestos: { include: { impuesto: true } },
        ...ServiciosService.INCLUDE_ASOCIACIONES,
      },
      skip,
      take,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(agenciaId: string, id: string, rol?: string) {
    const servicio = await this.prisma.servicio.findFirst({
      where: { ...this.whereCatalogo(agenciaId, rol), id },
      include: {
        proveedor: true,
        tipoServicio: true,
        moneda: true,
        impuestos: { include: { impuesto: true } },
        ...ServiciosService.INCLUDE_ASOCIACIONES,
      },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    return servicio;
  }

  /**
   * Reemplaza por completo la lista de servicios asociados de `servicioId` por `asociadoIds`,
   * en ese orden (ver docstring de CreateServicioDto.asociadoIds). Ignora silenciosamente IDs
   * que no existan o pertenezcan a otra agencia, e ignora la auto-referencia (un servicio no
   * puede asociarse a sí mismo).
   */
  private async reemplazarAsociaciones(tx: Prisma.TransactionClient, agenciaId: string, servicioId: string, asociadoIds: string[]) {
    await tx.servicioAsociado.deleteMany({ where: { servicioId } });
    const idsValidos = Array.from(new Set(asociadoIds)).filter((id) => id !== servicioId);
    if (!idsValidos.length) return;
    const existentes = await tx.servicio.findMany({
      where: { id: { in: idsValidos }, agenciaId },
      select: { id: true },
    });
    const existentesSet = new Set(existentes.map((s) => s.id));
    const ordenados = asociadoIds.filter((id) => existentesSet.has(id) && id !== servicioId);
    await tx.servicioAsociado.createMany({
      data: Array.from(new Set(ordenados)).map((servicioAsociadoId, orden) => ({
        servicioId,
        servicioAsociadoId,
        orden,
      })),
    });
  }

  create(agenciaId: string, dto: CreateServicioDto) {
    const { impuestoIds, asociadoIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const servicio = await tx.servicio.create({
        data: {
          ...data,
          agenciaId,
          impuestos: impuestoIds?.length
            ? { create: impuestoIds.map((impuestoId) => ({ impuestoId })) }
            : undefined,
        },
      });
      if (asociadoIds) {
        await this.reemplazarAsociaciones(tx, agenciaId, servicio.id, asociadoIds);
      }
      return servicio;
    });
  }

  async update(agenciaId: string, id: string, dto: Partial<CreateServicioDto>) {
    await this.findOne(agenciaId, id);
    const { impuestoIds, asociadoIds, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (impuestoIds) {
        await tx.servicioImpuesto.deleteMany({ where: { servicioId: id } });
        await tx.servicioImpuesto.createMany({
          data: impuestoIds.map((impuestoId) => ({ servicioId: id, impuestoId })),
        });
      }
      if (asociadoIds) {
        await this.reemplazarAsociaciones(tx, agenciaId, id, asociadoIds);
      }
      return tx.servicio.update({ where: { id }, data });
    });
  }

  async remove(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.servicio.update({ where: { id }, data: { estado: 'INACTIVO' } });
  }
}
