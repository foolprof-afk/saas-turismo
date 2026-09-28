import { Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { LinksPagoService } from './links-pago.service';

/**
 * Endpoint público (sin login) que reciben los proveedores de pasarela de pago para confirmar
 * un pago (ej. Recurrente). No hay guard porque el proveedor no puede autenticarse con JWT: la
 * seguridad depende de la firma HMAC del body, verificada dentro de LinksPagoService.procesarWebhook
 * según el adapter de cada proveedor (ver providers/recurrente.provider.ts).
 */
@Controller('webhooks/pasarelas-pago')
export class LinksPagoWebhookController {
  constructor(private readonly linksPagoService: LinksPagoService) {}

  @Post(':pasarelaPagoId')
  recibir(@Param('pasarelaPagoId') pasarelaPagoId: string, @Headers() headers: Record<string, string>, @Req() req: Request) {
    const rawBody = ((req as any).rawBody as Buffer | undefined)?.toString('utf8') ?? JSON.stringify(req.body);
    return this.linksPagoService.procesarWebhook(pasarelaPagoId, headers, rawBody);
  }
}
