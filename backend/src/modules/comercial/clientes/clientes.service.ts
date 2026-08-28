import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../../mantenedores/common/base-crud.service';

@Injectable()
export class ClientesService extends BaseCrudService<PrismaService['cliente']> {
  constructor(prisma: PrismaService) {
    super(prisma.cliente, 'Cliente');
  }
}
