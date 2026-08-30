import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { assertPermiso } from '../../../common/utils/permisos.util';
import { PlantillasItinerarioService } from './plantillas-itinerario.service';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';

@Controller('plantillas-itinerario')
@UseGuards(JwtAuthGuard)
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
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePlantillaDto) {
    assertPermiso(user, 'plantillas-itinerario', 'escribir');
    return this.plantillasService.create(user.agenciaId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreatePlantillaDto,
  ) {
    assertPermiso(user, 'plantillas-itinerario', 'escribir');
    return this.plantillasService.update(user.agenciaId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, 'plantillas-itinerario', 'eliminar');
    return this.plantillasService.remove(user.agenciaId, id);
  }
}
