import { Module } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesController } from './cotizaciones.controller';
import { ReservasModule } from '../reservas/reservas.module';

@Module({
  imports: [ReservasModule],
  providers: [CotizacionesService],
  controllers: [CotizacionesController],
})
export class CotizacionesModule {}
