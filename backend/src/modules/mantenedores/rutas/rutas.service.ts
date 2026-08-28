import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class RutasService extends BaseCrudService<PrismaService['ruta']> {
  constructor(prisma: PrismaService) {
    super(prisma.ruta, 'Ruta');
  }
}
