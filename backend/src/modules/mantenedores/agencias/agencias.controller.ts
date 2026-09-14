import { Body, Controller, ForbiddenException, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AgenciasService } from './agencias.service';

// Solo el dueño de la SaaS (usuario admin de la agencia marcada esPlataforma=true) puede
// gestionar agencias. Un admin de una agencia cliente normal no debe poder crear/ver otras.
function exigirPlataforma(user: AuthenticatedUser) {
  if (!user.agenciaEsPlataforma) {
    throw new ForbiddenException('No tienes permisos para gestionar agencias');
  }
}

@Controller('agencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgenciasController {
  constructor(private readonly agenciasService: AgenciasService) {}

  @Get()
  @Roles('admin')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    exigirPlataforma(user);
    return this.agenciasService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    exigirPlataforma(user);
    return this.agenciasService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: { nombre: string; subdominio: string; adminNombre: string; adminEmail: string; adminPassword: string },
  ) {
    exigirPlataforma(user);
    return this.agenciasService.crearConAdmin(data);
  }

  @Put(':id')
  @Roles('admin')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() data: Record<string, unknown>) {
    exigirPlataforma(user);
    return this.agenciasService.update(id, data);
  }
}
