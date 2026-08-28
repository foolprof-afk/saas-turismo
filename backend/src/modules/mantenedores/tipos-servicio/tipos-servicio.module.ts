import { Module } from '@nestjs/common';
import { TiposServicioService } from './tipos-servicio.service';
import { TiposServicioController } from './tipos-servicio.controller';

@Module({
  providers: [TiposServicioService],
  controllers: [TiposServicioController],
})
export class TiposServicioModule {}
