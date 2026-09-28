import { Module } from '@nestjs/common';
import { PasarelasPagoService } from './pasarelas-pago.service';
import { PasarelasPagoController } from './pasarelas-pago.controller';

@Module({
  providers: [PasarelasPagoService],
  controllers: [PasarelasPagoController],
  exports: [PasarelasPagoService],
})
export class PasarelasPagoModule {}
