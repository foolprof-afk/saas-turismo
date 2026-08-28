import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class GuiasService extends BaseCrudService<PrismaService['guia']> {
  constructor(prisma: PrismaService) {
    super(prisma.guia, 'Guía');
  }
}
