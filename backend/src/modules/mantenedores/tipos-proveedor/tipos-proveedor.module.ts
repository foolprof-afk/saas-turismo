import { Module } from '@nestjs/common';
import { TiposProveedorService } from './tipos-proveedor.service';
import { TiposProveedorController } from './tipos-proveedor.controller';

@Module({
  providers: [TiposProveedorService],
  controllers: [TiposProveedorController],
})
export class TiposProveedorModule {}
