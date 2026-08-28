import { Module } from '@nestjs/common';
import { PagosModule } from './pagos/pagos.module';
import { LiquidacionesModule } from './liquidaciones/liquidaciones.module';

@Module({
  imports: [PagosModule, LiquidacionesModule],
})
export class FinanzasModule {}
