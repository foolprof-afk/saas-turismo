import { Controller, Get, Param } from '@nestjs/common';
import { LinksPagoService } from './links-pago.service';

/**
 * Endpoint público (sin login) al que el cliente vuelve tras pagar o cancelar un checkout de
 * pasarela (ver successUrl/cancelUrl en LinksPagoService.generar). Muestra el estado real del
 * LinkPago, confirmado por el webhook del proveedor, no solo lo que indicó la redirección del
 * checkout (que puede llegar antes de que el webhook se procese).
 */
@Controller('pago-cliente')
export class PagoClienteController {
  constructor(private readonly linksPagoService: LinksPagoService) {}

  @Get('publico/:id')
  obtenerPublico(@Param('id') id: string) {
    return this.linksPagoService.obtenerPublico(id);
  }
}
