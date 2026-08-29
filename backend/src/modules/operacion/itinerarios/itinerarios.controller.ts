import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ItinerariosService } from './itinerarios.service';

@Controller('itinerarios')
@UseGuards(JwtAuthGuard)
export class ItinerariosController {
  constructor(private readonly itinerariosService: ItinerariosService) {}

  @Get()
  findPorFecha(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fecha') fecha: string,
    @Query('usuarioIds') usuarioIds?: string,
  ) {
    const vendedorIds = usuarioIds ? usuarioIds.split(',').filter(Boolean) : undefined;
    return this.itinerariosService.findPorFecha(user.agenciaId, fecha ?? new Date().toISOString(), vendedorIds);
  }

  @Get('reserva/:reservaId')
  findByReserva(@CurrentUser() user: AuthenticatedUser, @Param('reservaId') reservaId: string) {
    return this.itinerariosService.findByReserva(user.agenciaId, reservaId);
  }
}
