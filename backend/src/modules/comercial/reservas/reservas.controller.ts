import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReservasService } from './reservas.service';
import { CreateReservaDto } from './dto/create-reserva.dto';

@Controller('reservas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() pagination: PaginationDto) {
    return this.reservasService.findAll(user.agenciaId, pagination.skip, pagination.limit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reservasService.findOne(user.agenciaId, id);
  }

  @Post()
  @Roles('admin', 'vendedor')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReservaDto) {
    return this.reservasService.create(user.agenciaId, user.userId, dto);
  }

  @Patch(':id/cancelar')
  @Roles('admin', 'vendedor')
  cancelar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reservasService.cancelar(user.agenciaId, id);
  }
}
