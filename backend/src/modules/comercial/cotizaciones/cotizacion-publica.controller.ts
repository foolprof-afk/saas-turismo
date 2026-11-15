import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CotizacionesService } from './cotizaciones.service';
import { obtenerIpCliente } from '../../../common/utils/request-ip.util';

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
  // aceptación de las condiciones de reserva), transformándola en una reserva real. Se captura
  // IP y dispositivo como evidencia ante un posible contracargo (ver
  // CotizacionesService.confirmarPublica).
  @Post('publico/:token/confirmar')
  confirmarPublico(
    @Param('token') token: string,
    @Body() body: { aceptaCondiciones?: boolean },
    @Req() req: Request,
  ) {
    return this.cotizacionesService.confirmarPublica(
      token,
      Boolean(body?.aceptaCondiciones),
      obtenerIpCliente(req),
      req.headers['user-agent'],
    );
  }
}
