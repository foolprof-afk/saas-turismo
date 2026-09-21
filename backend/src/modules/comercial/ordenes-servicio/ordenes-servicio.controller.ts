import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { assertPermiso } from '../../../common/utils/permisos.util';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { FiltrosOrdenServicioDto } from './dto/filtros-orden-servicio.dto';

@Controller('ordenes-servicio')
@UseGuards(JwtAuthGuard)
export class OrdenesServicioController {
  constructor(private readonly ordenesServicioService: OrdenesServicioService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() filtros: FiltrosOrdenServicioDto) {
    assertPermiso(user, 'ordenes-servicio', 'leer');
    return this.ordenesServicioService.findAll(user.agenciaId, filtros);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, 'ordenes-servicio', 'leer');
    return this.ordenesServicioService.findOne(user.agenciaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrdenServicioDto) {
    assertPermiso(user, 'ordenes-servicio', 'escribir');
    return this.ordenesServicioService.create(user.agenciaId, user.userId, dto);
  }

  @Patch(':id/anular')
  anular(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, 'ordenes-servicio', 'escribir');
    return this.ordenesServicioService.anular(user.agenciaId, id);
  }

  @Delete(':id')
  eliminar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, 'ordenes-servicio', 'eliminar');
    return this.ordenesServicioService.eliminar(user.agenciaId, id);
  }
}
