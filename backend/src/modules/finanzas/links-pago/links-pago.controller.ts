import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { LinksPagoService } from './links-pago.service';
import { GenerarLinkPagoDto } from './dto/generar-link-pago.dto';

@Controller('reservas/:reservaId/links-pago')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LinksPagoController {
  constructor(private readonly linksPagoService: LinksPagoService) {}

  @Get()
  findByReserva(@CurrentUser() user: AuthenticatedUser, @Param('reservaId') reservaId: string) {
    return this.linksPagoService.findByReserva(user.agenciaId, reservaId);
  }

  @Post()
  @Roles('admin', 'vendedor')
  generar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservaId') reservaId: string,
    @Body() dto: GenerarLinkPagoDto,
  ) {
    return this.linksPagoService.generar(user.agenciaId, reservaId, dto);
  }

  @Post(':id/cancelar')
  @Roles('admin', 'vendedor', 'finanzas')
  cancelar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservaId') reservaId: string,
    @Param('id') id: string,
  ) {
    return this.linksPagoService.cancelar(user.agenciaId, reservaId, id);
  }
}
