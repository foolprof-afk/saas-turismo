import { Module } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { RutasController } from './rutas.controller';

@Module({
  providers: [RutasService],
  controllers: [RutasController],
})
export class RutasModule {}
