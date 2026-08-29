import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * TipoServicio es un catálogo global (no tiene agenciaId en el schema),
 * por eso no usa BaseCrudService.
 */
@Injectable()
export class TiposServicioService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tipoServicio.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const tipo = await this.prisma.tipoServicio.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de servicio no encontrado');
    return tipo;
  }

  create(data: { nombre: string; descripcion?: string }) {
    return this.prisma.tipoServicio.create({ data });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    return this.prisma.tipoServicio.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tipoServicio.delete({ where: { id } });
  }
}
