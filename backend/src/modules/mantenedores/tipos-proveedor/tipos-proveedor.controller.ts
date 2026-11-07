import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { assertPermiso } from '../../../common/utils/permisos.util';
import { TiposProveedorService } from './tipos-proveedor.service';

@Controller('tipos-proveedor')
@UseGuards(JwtAuthGuard)
export class TiposProveedorController {
  constructor(private readonly tiposProveedorService: TiposProveedorService) {}

  @Get()
  findAll() {
    return this.tiposProveedorService.findAll();
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() data: { nombre: string }) {
    assertPermiso(user, 'proveedores', 'escribir');
    return this.tiposProveedorService.create(data);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() data: Record<string, unknown>) {
    assertPermiso(user, 'proveedores', 'escribir');
    return this.tiposProveedorService.update(id, data);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, 'proveedores', 'eliminar');
    return this.tiposProveedorService.remove(id);
  }
}
