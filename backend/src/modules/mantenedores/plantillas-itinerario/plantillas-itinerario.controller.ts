import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PlantillasItinerarioService } from './plantillas-itinerario.service';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';

@Controller('plantillas-itinerario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlantillasItinerarioController {
  constructor(private readonly plantillasService: PlantillasItinerarioService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() pagination: PaginationDto) {
    return this.plantillasService.findAll(user.agenciaId, pagination.skip, pagination.limit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.plantillasService.findOne(user.agenciaId, id);
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePlantillaDto) {
    return this.plantillasService.create(user.agenciaId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.plantillasService.remove(user.agenciaId, id);
  }
}
