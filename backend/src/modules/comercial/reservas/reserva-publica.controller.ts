import { Controller, Get, Param } from '@nestjs/common';
import { ReservasService } from './reservas.service';

/**
 * Endpoint público (sin login) para que el cliente revise su reserva (y sus modificaciones
 * posteriores) vía el enlace generado en ReservasController.generarEnlace. El token es
 * autoverificable (HMAC), no hay guard. Análogo a CotizacionPublicaController.
 */
@Controller('reserva-cliente')
export class ReservaPublicaController {
  constructor(private readonly reservasService: ReservasService) {}

  @Get('publico/:token')
  obtenerPublico(@Param('token') token: string) {
    return this.reservasService.reservaPublica(token);
  }
}
