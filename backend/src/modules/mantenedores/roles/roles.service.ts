import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Rol es un catálogo global (no tiene agenciaId en el schema),
 * por eso no usa BaseCrudService. Solo lectura: los roles son fijos del sistema.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
  }
}
