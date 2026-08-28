import { Controller } from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('vehiculos')
export class VehiculosController extends BaseCrudController<any> {
  constructor(private readonly vehiculosService: VehiculosService) {
    super(vehiculosService);
  }
}
