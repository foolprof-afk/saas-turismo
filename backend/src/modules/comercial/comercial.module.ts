import { Module } from '@nestjs/common';
import { ClientesModule } from './clientes/clientes.module';
import { ReservasModule } from './reservas/reservas.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { OrdenesServicioModule } from './ordenes-servicio/ordenes-servicio.module';

@Module({
  imports: [ClientesModule, ReservasModule, VouchersModule, CotizacionesModule, OrdenesServicioModule],
  exports: [VouchersModule],
})
export class ComercialModule {}
