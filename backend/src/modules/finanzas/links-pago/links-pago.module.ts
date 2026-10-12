import { Module } from '@nestjs/common';
import { LinksPagoService } from './links-pago.service';
import { LinksPagoController } from './links-pago.controller';
import { LinksPagoWebhookController } from './links-pago-webhook.controller';
import { PagoClienteController } from './pago-cliente.controller';

@Module({
  providers: [LinksPagoService],
  controllers: [LinksPagoController, LinksPagoWebhookController, PagoClienteController],
})
export class LinksPagoModule {}
