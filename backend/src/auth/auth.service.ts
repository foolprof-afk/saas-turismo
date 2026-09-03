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
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: dto.email, estado: 'ACTIVO' },
      include: { rol: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!passwordValida) {
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
      },
    };
  }
}
