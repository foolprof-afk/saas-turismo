import { Module } from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { VehiculosController } from './vehiculos.controller';

@Module({
  providers: [VehiculosService],
  controllers: [VehiculosController],
})
export class VehiculosModule {}
