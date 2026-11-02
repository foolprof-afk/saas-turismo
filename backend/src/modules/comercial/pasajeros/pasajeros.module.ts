import { Module } from '@nestjs/common';
import { PasajerosService } from './pasajeros.service';
import { PasajerosController } from './pasajeros.controller';

@Module({
  providers: [PasajerosService],
  controllers: [PasajerosController],
})
export class PasajerosModule {}
