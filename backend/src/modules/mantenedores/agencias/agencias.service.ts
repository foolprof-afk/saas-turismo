import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * La Agencia es la raíz del tenant, por eso no usa BaseCrudService (que filtra por agenciaId).
 * Solo las agencias con esPlataforma=true (el dueño de la SaaS) pueden crear/listar agencias
 * (ver AgenciasController). Cada agencia cliente ingresa por su propia URL /a/{subdominio}.
 */
@Injectable()
export class AgenciasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.agencia.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const agencia = await this.prisma.agencia.findUnique({ where: { id } });
    if (!agencia) throw new NotFoundException('Agencia no encontrada');
    return agencia;
  }

  // Crea la agencia y su primer usuario admin en una sola transacción, para poder entregarle
  // al cliente su URL de acceso (/a/{subdominio}) y credenciales listas para usar.
  async crearConAdmin(data: {
    nombre: string;
    subdominio: string;
    adminNombre: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    const rolAdmin = await this.prisma.rol.findUnique({ where: { nombre: 'admin' } });
    if (!rolAdmin) throw new BadRequestException('No existe el rol admin en el sistema');

    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const agencia = await tx.agencia.create({
          data: { nombre: data.nombre, subdominio: data.subdominio },
        });
        const admin = await tx.usuario.create({
          data: {
            agenciaId: agencia.id,
            rolId: rolAdmin.id,
            nombre: data.adminNombre,
            email: data.adminEmail,
            passwordHash,
          },
        });
        return { agencia, admin: { id: admin.id, nombre: admin.nombre, email: admin.email } };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('El subdominio o el email ya están en uso');
      }
      throw err;
    }
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    try {
      return await this.prisma.agencia.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('El subdominio ya está en uso por otra agencia');
      }
      throw err;
    }
  }

  // Usado por la pantalla de login (sin autenticacion) para mostrar el logo de la agencia.
  // Con `slug` busca esa agencia (login propio de cada cliente en /a/{slug}); sin slug
  // devuelve la agencia plataforma (login raíz, solo el dueño de la SaaS).
  async brandingPublico(slug?: string) {
    const agencia = slug
      ? await this.prisma.agencia.findFirst({
          where: { subdominio: slug, estado: 'ACTIVO' },
          select: { nombre: true, logoUrl: true },
        })
      : await this.prisma.agencia.findFirst({
          where: { esPlataforma: true },
          select: { nombre: true, logoUrl: true },
        });
    return { nombre: agencia?.nombre ?? null, logoUrl: agencia?.logoUrl ?? null };
  }
}
