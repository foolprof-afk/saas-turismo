import { Module } from '@nestjs/common';
import { LinksPagoService } from './links-pago.service';
import { LinksPagoController } from './links-pago.controller';
import { LinksPagoWebhookController } from './links-pago-webhook.controller';

@Module({
  providers: [LinksPagoService],
  controllers: [LinksPagoController, LinksPagoWebhookController],
})
export class LinksPagoModule {}
