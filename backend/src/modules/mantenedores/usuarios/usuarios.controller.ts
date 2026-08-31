import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { assertPermiso } from '../../../common/utils/permisos.util';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() pagination: PaginationDto) {
    return this.usuariosService.findAll(user.agenciaId, pagination.skip, pagination.limit);
  }

  @Get('vendedores')
  findVendedores(@CurrentUser() user: AuthenticatedUser) {
    return this.usuariosService.findVendedores(user.agenciaId, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usuariosService.findOne(user.agenciaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUsuarioDto) {
    assertPermiso(user, 'usuarios', 'escribir');
    return this.usuariosService.create(user.agenciaId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    assertPermiso(user, 'usuarios', 'escribir');
    return this.usuariosService.update(user.agenciaId, id, data);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, 'usuarios', 'eliminar');
    return this.usuariosService.remove(user.agenciaId, id);
  }
}
