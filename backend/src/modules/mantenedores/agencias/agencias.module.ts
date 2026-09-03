import { Module } from '@nestjs/common';
import { AgenciasService } from './agencias.service';
import { AgenciasController } from './agencias.controller';
import { BrandingPublicoController } from './branding-publico.controller';

@Module({
  providers: [AgenciasService],
  controllers: [AgenciasController, BrandingPublicoController],
})
export class AgenciasModule {}
