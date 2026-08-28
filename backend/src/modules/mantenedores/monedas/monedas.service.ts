import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class MonedasService extends BaseCrudService<PrismaService['moneda']> {
  constructor(prisma: PrismaService) {
    super(prisma.moneda, 'Moneda');
  }
}
