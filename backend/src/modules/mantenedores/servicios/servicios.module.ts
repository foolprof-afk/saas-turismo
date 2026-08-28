import { Module } from '@nestjs/common';
import { ServiciosService } from './servicios.service';
import { ServiciosController } from './servicios.controller';

@Module({
  providers: [ServiciosService],
  controllers: [ServiciosController],
  exports: [ServiciosService],
})
export class ServiciosModule {}
