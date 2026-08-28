import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';

@Injectable()
export class PlantillasItinerarioService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeDiasServicios = {
    dias: {
      orderBy: { numeroDia: 'asc' as const },
      include: { servicios: { orderBy: { orden: 'asc' as const }, include: { servicio: true } } },
    },
  };

  findAll(agenciaId: string, skip = 0, take = 20) {
    return this.prisma.plantillaItinerario.findMany({
      where: { agenciaId },
      skip,
      take,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(agenciaId: string, id: string) {
    const plantilla = await this.prisma.plantillaItinerario.findFirst({
      where: { id, agenciaId },
      include: this.includeDiasServicios,
    });
    if (!plantilla) throw new NotFoundException('Plantilla de itinerario no encontrada');
    return plantilla;
  }

  create(agenciaId: string, dto: CreatePlantillaDto) {
    return this.prisma.plantillaItinerario.create({
      data: {
        agenciaId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        diasTotales: dto.diasTotales,
        dias: {
          create: dto.dias.map((dia) => ({
            numeroDia: dia.numeroDia,
            servicios: {
              create: dia.servicios.map((s) => ({
                servicioId: s.servicioId,
                horaInicio: s.horaInicio,
                orden: s.orden,
              })),
            },
          })),
        },
      },
      include: this.includeDiasServicios,
    });
  }

  async remove(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.plantillaItinerario.update({ where: { id }, data: { estado: 'INACTIVO' } });
  }
}
