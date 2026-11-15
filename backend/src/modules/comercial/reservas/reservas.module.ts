import { Module } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { ReservasController } from './reservas.controller';
import { CuadrePublicoController } from './cuadre-publico.controller';
import { ReservaPublicaController } from './reserva-publica.controller';
import { VouchersModule } from '../vouchers/vouchers.module';
import { LinksPagoModule } from '../../finanzas/links-pago/links-pago.module';

@Module({
  imports: [VouchersModule, LinksPagoModule],
  providers: [ReservasService],
  controllers: [ReservasController, CuadrePublicoController, ReservaPublicaController],
  exports: [ReservasService],
})
export class ReservasModule {}
