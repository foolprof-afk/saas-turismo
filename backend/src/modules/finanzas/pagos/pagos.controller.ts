import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PagosService } from './pagos.service';
import { FiltrosCuadrePagoDto } from './dto/filtros-cuadre-pago.dto';

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('reserva/:reservaId')
  findByReserva(@CurrentUser() user: AuthenticatedUser, @Param('reservaId') reservaId: string) {
    return this.pagosService.findByReserva(user.agenciaId, reservaId);
  }

  @Get('cuadre')
  cuadre(@CurrentUser() user: AuthenticatedUser, @Query() filtros: FiltrosCuadrePagoDto) {
    return this.pagosService.cuadre(user.agenciaId, filtros, user);
  }

  @Post('reserva/:reservaId')
  @Roles('admin', 'finanzas', 'vendedor')
  registrar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservaId') reservaId: string,
    @Body()
    data: {
      formaPagoId: string;
      monto: number;
      monedaId: string;
      referenciaExterna?: string;
      comprobanteUrl?: string;
    },
  ) {
    return this.pagosService.registrar(user.agenciaId, reservaId, user.userId, data);
  }
}
