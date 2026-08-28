import { Module } from '@nestjs/common';
import { FormasPagoService } from './formas-pago.service';
import { FormasPagoController } from './formas-pago.controller';

@Module({
  providers: [FormasPagoService],
  controllers: [FormasPagoController],
  exports: [FormasPagoService],
})
export class FormasPagoModule {}
