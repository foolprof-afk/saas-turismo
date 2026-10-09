import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  // El cliente confirma su cotización desde el enlace público (tras marcar el check de
  // aceptación de las condiciones de reserva), transformándola en una reserva real.
  @Post('publico/:token/confirmar')
  confirmarPublico(@Param('token') token: string, @Body() body: { aceptaCondiciones?: boolean }) {
    return this.cotizacionesService.confirmarPublica(token, Boolean(body?.aceptaCondiciones));
  }
}
