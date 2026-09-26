import { Controller, Get, Param } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';

/**
 * Endpoint público (sin login) para que el cliente vea la cotización al escanear el QR
 * generado en CotizacionesController.generarEnlace. El token es autoverificable (HMAC), no
 * hay guard.
 */
@Controller('cotizacion-cliente')
export class CotizacionPublicaController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get('publico/:token')
  obtenerPublico(@Param('token') token: string) {
    return this.cotizacionesService.cotizacionPublica(token);
  }
}
