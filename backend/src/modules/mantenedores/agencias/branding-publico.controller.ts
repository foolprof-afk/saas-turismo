import { Controller, Get, Query } from '@nestjs/common';
import { AgenciasService } from './agencias.service';

/**
 * Endpoint público (sin login) para que la pantalla de login muestre el logo de la agencia.
 * Separado de AgenciasController porque ese controller exige JwtAuthGuard + rol admin.
 * Sin `slug` devuelve el branding de la agencia plataforma (login raíz, solo dueño de la SaaS).
 * Con `slug` devuelve el branding de esa agencia (login por URL propia de cada cliente).
 */
@Controller('branding')
export class BrandingPublicoController {
  constructor(private readonly agenciasService: AgenciasService) {}

  @Get('publico')
  obtenerPublico(@Query('slug') slug?: string) {
    return this.agenciasService.brandingPublico(slug);
  }
}
