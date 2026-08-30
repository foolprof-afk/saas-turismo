import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(agenciaId: string, skip = 0, take = 20) {
    return this.prisma.usuario.findMany({
      where: { agenciaId },
      include: { rol: true, cliente: true },
      skip,
      take,
      orderBy: { nombre: 'asc' },
    });
  }

  // Vista filtrada para el mantenedor "Vendedores" del dashboard, sin duplicar tabla.
  findVendedores(agenciaId: string) {
    return this.prisma.usuario.findMany({
      where: { agenciaId, rol: { nombre: 'vendedor' } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(agenciaId: string, id: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, agenciaId },
      include: { rol: true, cliente: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async create(agenciaId: string, dto: CreateUsuarioDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password, permisos, ...rest } = dto;
    return this.prisma.usuario.create({
      data: {
        ...rest,
        agenciaId,
        passwordHash,
        permisos: (permisos ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async update(agenciaId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(agenciaId, id);
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password as string, 10);
      delete data.password;
    }
    return this.prisma.usuario.update({ where: { id }, data });
  }

  async remove(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.usuario.update({ where: { id }, data: { estado: 'INACTIVO' } });
  }
}
