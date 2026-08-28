import { Module } from '@nestjs/common';
import { ItinerariosService } from './itinerarios.service';
import { ItinerariosController } from './itinerarios.controller';

@Module({
  providers: [ItinerariosService],
  controllers: [ItinerariosController],
})
export class ItinerariosModule {}
