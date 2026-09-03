import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * La Agencia es la raíz del tenant, por eso no usa BaseCrudService (que filtra por agenciaId).
 * En Fase 1 solo existe una agencia; en Fase 2/3 este servicio queda listo para un panel super-admin.
 */
@Injectable()
export class AgenciasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.agencia.findMany();
  }

  async findOne(id: string) {
    const agencia = await this.prisma.agencia.findUnique({ where: { id } });
    if (!agencia) throw new NotFoundException('Agencia no encontrada');
    return agencia;
  }

  create(data: { nombre: string; subdominio: string; razonSocial?: string; rutONit?: string; timezone?: string }) {
    return this.prisma.agencia.create({ data });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    return this.prisma.agencia.update({ where: { id }, data });
  }

  // Usado por la pantalla de login (sin autenticacion) para mostrar el logo de la agencia.
  // En Fase 1 solo existe una agencia, por eso se toma la primera creada.
  async brandingPublico() {
    const agencia = await this.prisma.agencia.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { nombre: true, logoUrl: true },
    });
    return { nombre: agencia?.nombre ?? null, logoUrl: agencia?.logoUrl ?? null };
  }
}
