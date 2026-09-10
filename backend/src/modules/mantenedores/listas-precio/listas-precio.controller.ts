import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListasPrecioService } from './listas-precio.service';
import { BaseCrudController } from '../common/base-crud.controller';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Controller('listas-precio')
export class ListasPrecioController extends BaseCrudController<any> {
  constructor(private readonly listasPrecioService: ListasPrecioService) {
    super(listasPrecioService, 'listas-precio');
  }

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  misListas(@CurrentUser() user: AuthenticatedUser) {
    return this.listasPrecioService.misListas(user);
  }
}
