import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PasajerosService } from './pasajeros.service';

@Controller('pasajeros')
@UseGuards(JwtAuthGuard)
export class PasajerosController {
  constructor(private readonly pasajerosService: PasajerosService) {}

  @Get('buscar')
  buscar(@CurrentUser() user: AuthenticatedUser, @Query('q') q: string) {
    return this.pasajerosService.buscar(user.agenciaId, q);
  }
}
