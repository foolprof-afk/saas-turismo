import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class ListasPrecioService extends BaseCrudService<PrismaService['listaPrecio']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.listaPrecio, 'Lista de precio');
  }

  /**
   * Listas de precio que el usuario autenticado puede usar al crear una cotizacion/reserva.
   * El admin puede usar cualquier lista activa de la agencia; el resto de usuarios solo las
   * que se le hayan asignado explicitamente (Usuario.listasPrecio).
   */
  async misListas(user: AuthenticatedUser) {
    if (user.rol === 'admin') {
      return this.prisma.listaPrecio.findMany({
        where: { agenciaId: user.agenciaId, estado: 'ACTIVO' },
        orderBy: { nombre: 'asc' },
      });
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.userId },
      select: { listasPrecio: { where: { estado: 'ACTIVO' }, orderBy: { nombre: 'asc' } } },
    });
    return usuario?.listasPrecio ?? [];
  }
}
