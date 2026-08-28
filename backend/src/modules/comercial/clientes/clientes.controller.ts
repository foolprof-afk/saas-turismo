import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ClientesService } from './clientes.service';

// Clientes: cualquier usuario autenticado (vendedor incluido) puede crear/editar, no solo admin.
@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() pagination: PaginationDto) {
    return this.clientesService.findAll(user.agenciaId, pagination.skip, pagination.limit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clientesService.findOne(user.agenciaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() data: Record<string, unknown>) {
    return this.clientesService.create(user.agenciaId, data);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.clientesService.update(user.agenciaId, id, data);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clientesService.remove(user.agenciaId, id);
  }
}
