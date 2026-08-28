import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class VehiculosService extends BaseCrudService<PrismaService['vehiculo']> {
  constructor(prisma: PrismaService) {
    super(prisma.vehiculo, 'Vehículo');
  }
}
