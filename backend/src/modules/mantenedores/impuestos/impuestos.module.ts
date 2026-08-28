import { Module } from '@nestjs/common';
import { ImpuestosService } from './impuestos.service';
import { ImpuestosController } from './impuestos.controller';

@Module({
  providers: [ImpuestosService],
  controllers: [ImpuestosController],
})
export class ImpuestosModule {}
