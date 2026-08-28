import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { LiquidacionesService } from './liquidaciones.service';

@Controller('liquidaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'finanzas')
export class LiquidacionesController {
  constructor(private readonly liquidacionesService: LiquidacionesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.liquidacionesService.findAll(user.agenciaId);
  }

  @Post()
  generar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: { proveedorId: string; periodoInicio: string; periodoFin: string },
  ) {
    return this.liquidacionesService.generar(
      user.agenciaId,
      data.proveedorId,
      new Date(data.periodoInicio),
      new Date(data.periodoFin),
    );
  }

  @Patch(':id/pagar')
  marcarPagada(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.liquidacionesService.marcarPagada(user.agenciaId, id);
  }
}
