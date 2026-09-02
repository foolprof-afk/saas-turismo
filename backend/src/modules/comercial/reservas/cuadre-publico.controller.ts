import { Controller, Get, Param } from '@nestjs/common';
import { ReservasService } from './reservas.service';

/**
 * Endpoint público (sin login) para que un cliente revise su cuadre vía el enlace generado en
 * ReservasController.generarEnlaceCliente. El token es autoverificable (HMAC), no hay guard.
 */
@Controller('cuadre-cliente')
export class CuadrePublicoController {
  constructor(private readonly reservasService: ReservasService) {}

  @Get('publico/:token')
  obtenerPublico(@Param('token') token: string) {
    return this.reservasService.cuadrePublico(token);
  }
}
