import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { FiltrosCotizacionDto } from './dto/filtros-cotizacion.dto';

@Controller('cotizaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() filtros: FiltrosCotizacionDto) {
    return this.cotizacionesService.findAll(user.agenciaId, filtros.skip, filtros.limit, filtros, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cotizacionesService.findOne(user.agenciaId, id, user);
  }

  @Post()
  @Roles('admin', 'vendedor')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCotizacionDto) {
    return this.cotizacionesService.create(user.agenciaId, user.userId, user, dto);
  }

  @Patch(':id')
  @Roles('admin', 'vendedor')
  actualizar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCotizacionDto,
  ) {
    return this.cotizacionesService.actualizar(user.agenciaId, id, user, dto);
  }

  @Patch(':id/cancelar')
  @Roles('admin', 'vendedor')
  cancelar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cotizacionesService.cancelar(user.agenciaId, id);
  }

  @Patch(':id/confirmar')
  @Roles('admin', 'vendedor')
  confirmar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cotizacionesService.confirmar(user.agenciaId, id, user);
  }

  @Delete(':id')
  @Roles('admin', 'vendedor')
  eliminar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cotizacionesService.eliminar(user.agenciaId, id);
  }
}
