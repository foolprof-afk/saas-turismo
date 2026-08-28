import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class FormasPagoService extends BaseCrudService<PrismaService['formaPago']> {
  constructor(prisma: PrismaService) {
    super(prisma.formaPago, 'Forma de pago');
  }
}
