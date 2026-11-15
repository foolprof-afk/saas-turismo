import { Controller, Get, Param, Redirect, Req } from '@nestjs/common';
import { Request } from 'express';
import { LinksPagoService } from './links-pago.service';
import { obtenerIpCliente } from '../../../common/utils/request-ip.util';

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

  // El cliente llega aquí al hacer clic en "Pagar ahora" desde el enlace público de la reserva:
  // se registra IP y dispositivo (evidencia ante un posible contracargo, ver
  // LinksPagoService.registrarClickYObtenerUrl) y luego se redirige al checkout real de la
  // pasarela.
  @Get('publico/:id/ir')
  @Redirect()
  async irAPagar(@Param('id') id: string, @Req() req: Request) {
    const url = await this.linksPagoService.registrarClickYObtenerUrl(id, obtenerIpCliente(req), req.headers['user-agent']);
    return { url, statusCode: 302 };
  }
}
