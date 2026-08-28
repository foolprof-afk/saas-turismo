import { Controller } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('rutas')
export class RutasController extends BaseCrudController<any> {
  constructor(private readonly rutasService: RutasService) {
    super(rutasService);
  }
}
