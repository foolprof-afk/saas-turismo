import { Controller } from '@nestjs/common';
import { FormasPagoService } from './formas-pago.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('formas-pago')
export class FormasPagoController extends BaseCrudController<any> {
  constructor(private readonly formasPagoService: FormasPagoService) {
    super(formasPagoService, 'formas-pago');
  }
}
