import { Controller } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('proveedores')
export class ProveedoresController extends BaseCrudController<any> {
  constructor(private readonly proveedoresService: ProveedoresService) {
    super(proveedoresService, 'proveedores');
  }
}
