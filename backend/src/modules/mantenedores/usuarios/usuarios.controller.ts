import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() pagination: PaginationDto) {
    return this.usuariosService.findAll(user.agenciaId, pagination.skip, pagination.limit);
  }

  @Get('vendedores')
  findVendedores(@CurrentUser() user: AuthenticatedUser) {
    return this.usuariosService.findVendedores(user.agenciaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usuariosService.findOne(user.agenciaId, id);
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(user.agenciaId, dto);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.usuariosService.update(user.agenciaId, id, data);
  }
}
