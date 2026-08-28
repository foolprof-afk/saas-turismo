import { NotFoundException } from '@nestjs/common';

/**
 * Servicio CRUD genérico para mantenedores simples con scope por agenciaId.
 * Cada mantenedor extiende esta clase pasando el delegate de Prisma correspondiente.
 */
export abstract class BaseCrudService<TDelegate extends Record<string, any>> {
  protected constructor(
    protected readonly delegate: TDelegate,
    protected readonly entityName: string,
  ) {}

  findAll(agenciaId: string, skip = 0, take = 20) {
    return this.delegate.findMany({
      where: { agenciaId },
      skip,
      take,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(agenciaId: string, id: string) {
    const item = await this.delegate.findFirst({ where: { id, agenciaId } });
    if (!item) {
      throw new NotFoundException(`${this.entityName} no encontrado`);
    }
    return item;
  }

  create(agenciaId: string, data: Record<string, unknown>) {
    return this.delegate.create({ data: { ...data, agenciaId } });
  }

  async update(agenciaId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(agenciaId, id);
    return this.delegate.update({ where: { id }, data });
  }

  async remove(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.delegate.delete({ where: { id } });
  }
}
