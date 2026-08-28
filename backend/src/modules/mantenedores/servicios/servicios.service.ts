import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateServicioDto } from './dto/create-servicio.dto';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(agenciaId: string, skip = 0, take = 20) {
    return this.prisma.servicio.findMany({
      where: { agenciaId },
      include: { proveedor: true, tipoServicio: true, moneda: true, impuestos: { include: { impuesto: true } } },
      skip,
      take,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(agenciaId: string, id: string) {
    const servicio = await this.prisma.servicio.findFirst({
      where: { id, agenciaId },
      include: { proveedor: true, tipoServicio: true, moneda: true, impuestos: { include: { impuesto: true } } },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    return servicio;
  }

  create(agenciaId: string, dto: CreateServicioDto) {
    const { impuestoIds, ...data } = dto;
    return this.prisma.servicio.create({
      data: {
        ...data,
        agenciaId,
        impuestos: impuestoIds?.length
          ? { create: impuestoIds.map((impuestoId) => ({ impuestoId })) }
          : undefined,
      },
    });
  }

  async update(agenciaId: string, id: string, dto: Partial<CreateServicioDto>) {
    await this.findOne(agenciaId, id);
    const { impuestoIds, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (impuestoIds) {
        await tx.servicioImpuesto.deleteMany({ where: { servicioId: id } });
        await tx.servicioImpuesto.createMany({
          data: impuestoIds.map((impuestoId) => ({ servicioId: id, impuestoId })),
        });
      }
      return tx.servicio.update({ where: { id }, data });
    });
  }

  async remove(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.servicio.update({ where: { id }, data: { estado: 'INACTIVO' } });
  }
}
