import { Controller } from '@nestjs/common';
import { MonedasService } from './monedas.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('monedas')
export class MonedasController extends BaseCrudController<any> {
  constructor(private readonly monedasService: MonedasService) {
    super(monedasService);
  }
}
