import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { assertPermiso } from '../../../common/utils/permisos.util';
import { PasarelasPagoService } from './pasarelas-pago.service';

const PAGINA = 'pasarelas-pago';

@Controller('pasarelas-pago')
@UseGuards(JwtAuthGuard)
export class PasarelasPagoController {
  constructor(private readonly pasarelasPagoService: PasarelasPagoService) {}

  @Get('proveedores')
  proveedoresDisponibles() {
    return this.pasarelasPagoService.listarProveedoresDisponibles();
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.pasarelasPagoService.findAll(user.agenciaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pasarelasPagoService.findOne(user.agenciaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() data: Record<string, unknown>) {
    assertPermiso(user, PAGINA, 'escribir');
    return this.pasarelasPagoService.create(user.agenciaId, data as never);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() data: Record<string, unknown>) {
    assertPermiso(user, PAGINA, 'escribir');
    return this.pasarelasPagoService.update(user.agenciaId, id, data as never);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertPermiso(user, PAGINA, 'eliminar');
    return this.pasarelasPagoService.remove(user.agenciaId, id);
  }
}
