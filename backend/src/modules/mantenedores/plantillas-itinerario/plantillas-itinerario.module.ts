import { Module } from '@nestjs/common';
import { PlantillasItinerarioService } from './plantillas-itinerario.service';
import { PlantillasItinerarioController } from './plantillas-itinerario.controller';

@Module({
  providers: [PlantillasItinerarioService],
  controllers: [PlantillasItinerarioController],
  exports: [PlantillasItinerarioService],
})
export class PlantillasItinerarioModule {}
