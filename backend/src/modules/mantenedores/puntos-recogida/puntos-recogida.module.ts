import { Module } from '@nestjs/common';
import { PuntosRecogidaService } from './puntos-recogida.service';
import { PuntosRecogidaController } from './puntos-recogida.controller';

@Module({
  providers: [PuntosRecogidaService],
  controllers: [PuntosRecogidaController],
})
export class PuntosRecogidaModule {}
