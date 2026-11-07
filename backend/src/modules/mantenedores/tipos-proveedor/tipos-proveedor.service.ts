import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * TipoProveedor es un catálogo global (no tiene agenciaId en el schema),
 * igual que TipoServicio, por eso no usa BaseCrudService.
 */
@Injectable()
export class TiposProveedorService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tipoProveedor.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const tipo = await this.prisma.tipoProveedor.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de proveedor no encontrado');
    return tipo;
  }

  create(data: { nombre: string }) {
    return this.prisma.tipoProveedor.create({ data });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    return this.prisma.tipoProveedor.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tipoProveedor.delete({ where: { id } });
  }
}
