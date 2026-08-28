import { Controller } from '@nestjs/common';
import { PuntosRecogidaService } from './puntos-recogida.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('puntos-recogida')
export class PuntosRecogidaController extends BaseCrudController<any> {
  constructor(private readonly puntosRecogidaService: PuntosRecogidaService) {
    super(puntosRecogidaService);
  }
}
