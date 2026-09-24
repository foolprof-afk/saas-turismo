import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LogsService } from '../modules/mantenedores/logs/logs.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    let agenciaId: string | undefined;
    if (dto.agenciaSlug) {
      const agencia = await this.prisma.agencia.findUnique({
        where: { subdominio: dto.agenciaSlug },
      });
      if (!agencia || agencia.estado !== 'ACTIVO') {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      agenciaId = agencia.id;
    }

    // El email es único por agencia, no globalmente (@@unique([agenciaId, email])), así que
    // cuando se ingresa por el login principal (sin agenciaSlug) puede haber más de un usuario
    // con ese correo en agencias distintas. Se busca entre todos los candidatos activos y se
    // valida la contraseña de cada uno hasta encontrar el que corresponde, para que el usuario
    // no tenga que saber ni elegir la URL de su agencia de antemano.
    const candidatos = await this.prisma.usuario.findMany({
      where: agenciaId
        ? { email: dto.email, estado: 'ACTIVO', agenciaId }
        : { email: dto.email, estado: 'ACTIVO', agencia: { estado: 'ACTIVO' } },
      include: { rol: true, agencia: { select: { esPlataforma: true, subdominio: true } } },
    });

    let usuario: (typeof candidatos)[number] | undefined;
    for (const candidato of candidatos) {
      if (await bcrypt.compare(dto.password, candidato.passwordHash)) {
        usuario = candidato;
        break;
      }
    }

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    this.logsService.registrar({
      agenciaId: usuario.agenciaId,
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: 'LOGIN',
      modulo: 'auth',
      ip,
    });

    const payload = {
      sub: usuario.id,
      agenciaId: usuario.agenciaId,
      rol: usuario.rol.nombre,
      email: usuario.email,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol.nombre,
        agenciaId: usuario.agenciaId,
        clienteId: usuario.clienteId,
        permisos: usuario.permisos,
        agenciaEsPlataforma: usuario.agencia.esPlataforma,
        agenciaSlug: usuario.agencia.subdominio,
      },
    };
  }
}
