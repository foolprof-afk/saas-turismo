import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type PermisoAccion = 'leer' | 'escribir' | 'eliminar';
export type PermisosUsuario = Record<string, Partial<Record<PermisoAccion, boolean>>>;

export interface AuthenticatedUser {
  userId: string;
  agenciaId: string;
  rol: string;
  email: string;
  clienteId: string | null;
  permisos: PermisosUsuario;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
