import { Module } from '@nestjs/common';
import { ItinerariosModule } from './itinerarios/itinerarios.module';
import { CheckinModule } from './checkin/checkin.module';

@Module({
  imports: [ItinerariosModule, CheckinModule],
})
export class OperacionModule {}
