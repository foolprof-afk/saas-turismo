import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class MonedasService extends BaseCrudService<PrismaService['moneda']> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService.moneda, 'Moneda');
  }

  // Solo puede haber una moneda principal por agencia (es la moneda a la que se convierten
  // todos los cuadres/pagos). Al marcar una como principal, se desmarca la anterior.
  private async desmarcarPrincipalAnterior(agenciaId: string, exceptoId?: string) {
    await this.prismaService.moneda.updateMany({
      where: { agenciaId, esPrincipal: true, ...(exceptoId ? { NOT: { id: exceptoId } } : {}) },
      data: { esPrincipal: false },
    });
  }

  async create(agenciaId: string, data: Record<string, unknown>) {
    if (data.esPrincipal) {
      await this.desmarcarPrincipalAnterior(agenciaId);
    }
    return super.create(agenciaId, data);
  }

  async update(agenciaId: string, id: string, data: Record<string, unknown>) {
    if (data.esPrincipal) {
      await this.desmarcarPrincipalAnterior(agenciaId, id);
    }
    return super.update(agenciaId, id, data);
  }
}
