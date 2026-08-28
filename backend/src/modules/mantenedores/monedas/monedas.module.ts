import { Module } from '@nestjs/common';
import { MonedasService } from './monedas.service';
import { MonedasController } from './monedas.controller';

@Module({
  providers: [MonedasService],
  controllers: [MonedasController],
  exports: [MonedasService],
})
export class MonedasModule {}
