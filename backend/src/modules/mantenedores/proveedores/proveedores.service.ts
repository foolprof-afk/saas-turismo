import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class ProveedoresService extends BaseCrudService<PrismaService['proveedor']> {
  constructor(prisma: PrismaService) {
    super(prisma.proveedor, 'Proveedor');
  }
}
