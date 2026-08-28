import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TiposServicioService } from './tipos-servicio.service';

@Controller('tipos-servicio')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles('admin')
  create(@Body() data: { nombre: string; descripcion?: string; precio: number }) {
    return this.tiposServicioService.create(data);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return this.tiposServicioService.update(id, data);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.tiposServicioService.remove(id);
  }
}
