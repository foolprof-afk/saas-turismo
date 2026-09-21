import { Module } from '@nestjs/common';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { OrdenesServicioController } from './ordenes-servicio.controller';

@Module({
  controllers: [OrdenesServicioController],
  providers: [OrdenesServicioService],
})
export class OrdenesServicioModule {}
