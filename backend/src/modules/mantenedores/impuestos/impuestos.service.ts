import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class ImpuestosService extends BaseCrudService<PrismaService['impuesto']> {
  constructor(prisma: PrismaService) {
    super(prisma.impuesto, 'Impuesto');
  }
}
