import { Module } from '@nestjs/common';
import { ListasPrecioService } from './listas-precio.service';
import { ListasPrecioController } from './listas-precio.controller';

@Module({
  providers: [ListasPrecioService],
  controllers: [ListasPrecioController],
  exports: [ListasPrecioService],
})
export class ListasPrecioModule {}
