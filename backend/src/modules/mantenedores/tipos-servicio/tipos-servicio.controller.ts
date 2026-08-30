import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { assertPermiso } from '../../../common/utils/permisos.util';
import { TiposServicioService } from './tipos-servicio.service';

@Controller('tipos-servicio')
@UseGuards(JwtAuthGuard)
export class TiposServicioController {
  constructor(private readonly tiposServicioService: TiposServicioService) {}

  @Get()
  findAll() {
    return this.tiposServicioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiposServicioService.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() data: { nombre: string; descripcion?: string }) {
    assertPermiso(user, 'tipos-servicio', 'escribir');
    return this.tiposServicioService.create(data);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() data: Record<string, unknown>) {
    assertPermiso(user, 'tipos-servicio', 'escribir');
    return this.tiposServicioService.update(id, data);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, 'tipos-servicio', 'eliminar');
    return this.tiposServicioService.remove(id);
  }
}
