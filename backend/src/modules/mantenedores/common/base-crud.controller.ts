import { Body, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { assertPermiso } from '../../../common/utils/permisos.util';
import { BaseCrudService } from './base-crud.service';

/**
 * Controller base para mantenedores. La lectura está abierta a cualquier usuario
 * autenticado de la agencia; las mutaciones requieren rol admin o permiso explícito
 * (Usuario.permisos[pagina].escribir / .eliminar) para la página del mantenedor.
 */
export abstract class BaseCrudController<TDelegate extends Record<string, any>> {
  protected constructor(
    protected readonly service: BaseCrudService<TDelegate>,
    protected readonly pagina: string,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() pagination: PaginationDto) {
    return this.service.findAll(user.agenciaId, pagination.skip, pagination.limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.agenciaId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() data: Record<string, unknown>) {
    assertPermiso(user, this.pagina, 'escribir');
    return this.service.create(user.agenciaId, data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    assertPermiso(user, this.pagina, 'escribir');
    return this.service.update(user.agenciaId, id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, this.pagina, 'eliminar');
    return this.service.remove(user.agenciaId, id);
  }
}
