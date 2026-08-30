import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser, PermisoAccion } from '../decorators/current-user.decorator';

/**
 * Los admin tienen acceso total siempre. Para el resto de roles, el acceso a cada
 * página/acción se controla con Usuario.permisos ({ [pagina]: { leer, escribir, eliminar } }).
 */
export function tienePermiso(user: AuthenticatedUser, pagina: string, accion: PermisoAccion): boolean {
  if (user.rol === 'admin') return true;
  return Boolean(user.permisos?.[pagina]?.[accion]);
}

export function assertPermiso(user: AuthenticatedUser, pagina: string, accion: PermisoAccion): void {
  if (!tienePermiso(user, pagina, accion)) {
    throw new ForbiddenException('No tienes permisos para realizar esta acción');
  }
}
