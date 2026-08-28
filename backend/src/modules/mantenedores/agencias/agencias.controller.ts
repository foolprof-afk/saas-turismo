import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AgenciasService } from './agencias.service';

@Controller('agencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgenciasController {
  constructor(private readonly agenciasService: AgenciasService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.agenciasService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.agenciasService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() data: { nombre: string; subdominio: string }) {
    return this.agenciasService.create(data);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return this.agenciasService.update(id, data);
  }
}
