import { Global, Module } from '@nestjs/common';
import { LinksCortosService } from './links-cortos.service';
import { LinksCortosController } from './links-cortos.controller';

// Global: lo usan servicios de comercial (reservas, vouchers, cotizaciones) para acortar los
// enlaces públicos que generan, sin tener que importar este módulo en cada uno.
@Global()
@Module({
  controllers: [LinksCortosController],
  providers: [LinksCortosService],
  exports: [LinksCortosService],
})
export class LinksCortosModule {}
