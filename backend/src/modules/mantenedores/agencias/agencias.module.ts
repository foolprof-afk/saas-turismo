import { Module } from '@nestjs/common';
import { AgenciasService } from './agencias.service';
import { AgenciasController } from './agencias.controller';

@Module({
  providers: [AgenciasService],
  controllers: [AgenciasController],
})
export class AgenciasModule {}
