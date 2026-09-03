import { Controller, Get } from '@nestjs/common';
import { AgenciasService } from './agencias.service';

/**
 * Endpoint público (sin login) para que la pantalla de login muestre el logo de la agencia.
 * Separado de AgenciasController porque ese controller exige JwtAuthGuard + rol admin.
 */
@Controller('branding')
export class BrandingPublicoController {
  constructor(private readonly agenciasService: AgenciasService) {}

  @Get('publico')
  obtenerPublico() {
    return this.agenciasService.brandingPublico();
  }
}
