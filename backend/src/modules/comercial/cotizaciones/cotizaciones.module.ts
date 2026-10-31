import { Module } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionPublicaController } from './cotizacion-publica.controller';
import { ReservasModule } from '../reservas/reservas.module';
import { LinksPagoModule } from '../../finanzas/links-pago/links-pago.module';

@Module({
  imports: [ReservasModule, LinksPagoModule],
  providers: [CotizacionesService],
  controllers: [CotizacionesController, CotizacionPublicaController],
})
export class CotizacionesModule {}
