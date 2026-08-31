import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ReservasService } from './reservas.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { ConfirmarReservaDto } from './dto/confirmar-reserva.dto';
import { FiltrosReservaDto } from './dto/filtros-reserva.dto';

@Controller('reservas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() filtros: FiltrosReservaDto) {
    return this.reservasService.findAll(user.agenciaId, filtros.skip, filtros.limit, filtros, user);
  }

  @Get('cuadre')
  cuadre(@CurrentUser() user: AuthenticatedUser, @Query() filtros: FiltrosReservaDto) {
    return this.reservasService.cuadre(user.agenciaId, filtros, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reservasService.findOne(user.agenciaId, id, user);
  }

  @Post()
  @Roles('admin', 'vendedor')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReservaDto) {
    return this.reservasService.create(user.agenciaId, user.userId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'vendedor')
  actualizar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReservaDto,
  ) {
    return this.reservasService.actualizar(user.agenciaId, id, dto);
  }

  @Patch(':id/cancelar')
  @Roles('admin', 'vendedor')
  cancelar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reservasService.cancelar(user.agenciaId, id);
  }

  @Patch(':id/confirmar')
  @Roles('admin', 'vendedor')
  confirmar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConfirmarReservaDto,
  ) {
    return this.reservasService.confirmar(user.agenciaId, id, dto);
  }
}
