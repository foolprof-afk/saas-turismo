import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { resolverVendedorIdsPermitidos } from '../../../common/utils/visibilidad.util';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(agenciaId: string, skip = 0, take = 20) {
    return this.prisma.usuario.findMany({
      where: { agenciaId },
      include: { rol: true, cliente: true, usuariosVisibles: { select: { id: true, nombre: true } } },
      skip,
      take,
      orderBy: { nombre: 'asc' },
    });
  }

  // Vista filtrada para el mantenedor "Vendedores" del dashboard, sin duplicar tabla. Si quien
  // consulta no es admin, solo ve vendedores dentro de su propia visibilidad (el mismo + los
  // usuarios hijos que se le hayan asignado en Usuario.usuariosVisibles).
  async findVendedores(agenciaId: string, user: AuthenticatedUser) {
    const idsPermitidos = await resolverVendedorIdsPermitidos(this.prisma, user);
    return this.prisma.usuario.findMany({
      where: {
        agenciaId,
        rol: { nombre: 'vendedor' },
        ...(idsPermitidos ? { id: { in: idsPermitidos } } : {}),
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(agenciaId: string, id: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, agenciaId },
      include: { rol: true, cliente: true, usuariosVisibles: { select: { id: true, nombre: true } } },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async create(agenciaId: string, dto: CreateUsuarioDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password, permisos, usuariosVisiblesIds, ...rest } = dto;
    return this.prisma.usuario.create({
      data: {
        ...rest,
        agenciaId,
        passwordHash,
        permisos: (permisos ?? {}) as Prisma.InputJsonValue,
        ...(usuariosVisiblesIds?.length
          ? { usuariosVisibles: { connect: usuariosVisiblesIds.map((id) => ({ id })) } }
          : {}),
      },
    });
  }

  async update(agenciaId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(agenciaId, id);
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password as string, 10);
      delete data.password;
    }
    const usuariosVisiblesIds = data.usuariosVisiblesIds as string[] | undefined;
    delete data.usuariosVisiblesIds;
    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...data,
        ...(usuariosVisiblesIds
          ? { usuariosVisibles: { set: usuariosVisiblesIds.map((uid) => ({ id: uid })) } }
          : {}),
      },
    });
  }

  async remove(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.usuario.update({ where: { id }, data: { estado: 'INACTIVO' } });
  }
}
