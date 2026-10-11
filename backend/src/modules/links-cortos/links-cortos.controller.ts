import { Controller, Get, Param, Redirect } from '@nestjs/common';
import { LinksCortosService } from './links-cortos.service';

/**
 * Endpoint público (sin login) que redirige un código corto a la URL completa original. El
 * código no tiene ninguna información ni firma propia: la seguridad del enlace de destino
 * (token HMAC/JWT, expiración) se sigue validando normalmente al llegar ahí.
 *
 * Internamente la ruta es /l/:codigo, pero públicamente se comparte como /api/l/:codigo (ver
 * LinksCortosService): en producción nginx reenvía /api/ al backend y le quita ese prefijo
 * antes de reenviarlo, así que lo que llega aquí es /l/:codigo.
 */
@Controller('l')
export class LinksCortosController {
  constructor(private readonly linksCortosService: LinksCortosService) {}

  @Get(':codigo')
  @Redirect()
  async ir(@Param('codigo') codigo: string) {
    const destino = await this.linksCortosService.resolver(codigo);
    return { url: destino, statusCode: 302 };
  }
}
