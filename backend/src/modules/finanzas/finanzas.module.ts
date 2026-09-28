import { Module } from '@nestjs/common';
import { PagosModule } from './pagos/pagos.module';
import { LiquidacionesModule } from './liquidaciones/liquidaciones.module';
import { LinksPagoModule } from './links-pago/links-pago.module';

@Module({
  imports: [PagosModule, LiquidacionesModule, LinksPagoModule],
})
export class FinanzasModule {}
