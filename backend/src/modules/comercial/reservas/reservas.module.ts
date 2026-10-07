import { Module } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { ReservasController } from './reservas.controller';
import { CuadrePublicoController } from './cuadre-publico.controller';
import { ReservaPublicaController } from './reserva-publica.controller';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [VouchersModule],
  providers: [ReservasService],
  controllers: [ReservasController, CuadrePublicoController, ReservaPublicaController],
  exports: [ReservasService],
})
export class ReservasModule {}
