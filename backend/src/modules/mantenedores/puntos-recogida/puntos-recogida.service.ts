import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class PuntosRecogidaService extends BaseCrudService<PrismaService['puntoRecogida']> {
  constructor(prisma: PrismaService) {
    super(prisma.puntoRecogida, 'Punto de recogida');
  }
}
