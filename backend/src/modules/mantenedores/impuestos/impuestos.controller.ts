import { Controller } from '@nestjs/common';
import { ImpuestosService } from './impuestos.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('impuestos')
export class ImpuestosController extends BaseCrudController<any> {
  constructor(private readonly impuestosService: ImpuestosService) {
    super(impuestosService, 'impuestos');
  }
}
