import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListarLogsDto } from './dto/listar-logs.dto';

export type AccionLog = 'LOGIN' | 'ACCESO' | 'CREAR' | 'MODIFICAR' | 'ELIMINAR';

interface RegistrarLogParams {
  agenciaId: string;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  accion: AccionLog;
  modulo: string;
  entidadId?: string | null;
  descripcion?: string | null;
}

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  // El registro de logs nunca debe interrumpir la operacion principal: si falla, se ignora.
  registrar(params: RegistrarLogParams): void {
    this.prisma.logActividad
      .create({
        data: {
          agenciaId: params.agenciaId,
          usuarioId: params.usuarioId ?? undefined,
          usuarioEmail: params.usuarioEmail ?? undefined,
          accion: params.accion,
          modulo: params.modulo,
          entidadId: params.entidadId ?? undefined,
          descripcion: params.descripcion ?? undefined,
        },
      })
      .catch(() => null);
  }

  async listar(agenciaId: string, filtros: ListarLogsDto) {
    const where: Record<string, unknown> = { agenciaId };
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.accion) where.accion = filtros.accion;
    if (filtros.modulo) where.modulo = filtros.modulo;
    if (filtros.fechaInicio || filtros.fechaFin) {
      where.createdAt = {
        ...(filtros.fechaInicio ? { gte: new Date(filtros.fechaInicio) } : {}),
        ...(filtros.fechaFin ? { lte: new Date(`${filtros.fechaFin}T23:59:59`) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.logActividad.findMany({
        where,
        include: { usuario: { select: { nombre: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: filtros.skip,
        take: filtros.limit,
      }),
      this.prisma.logActividad.count({ where }),
    ]);

    return { items, total };
  }
}
