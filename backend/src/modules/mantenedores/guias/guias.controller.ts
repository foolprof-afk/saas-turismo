import { Controller } from '@nestjs/common';
import { GuiasService } from './guias.service';
import { BaseCrudController } from '../common/base-crud.controller';

@Controller('guias')
export class GuiasController extends BaseCrudController<any> {
  constructor(private readonly guiasService: GuiasService) {
    super(guiasService);
  }
}
