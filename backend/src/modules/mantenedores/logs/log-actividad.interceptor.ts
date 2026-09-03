import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { obtenerIpCliente } from '../../../common/utils/request-ip.util';
import { AccionLog, LogsService } from './logs.service';

/**
 * Registra automaticamente en LogActividad toda operacion (GET/POST/PUT/PATCH/DELETE) hecha por
 * un usuario autenticado, en cualquier controlador de la app. El modulo se infiere del nombre del
 * controlador (ej. "ClientesController" -> "clientes"). Se excluyen AuthController (login se
 * registra explicitamente en AuthService, antes de emitir el token) y LogsController (para no
 * generar ruido con la propia consulta del mantenedor de logs).
 */
const CONTROLLERS_EXCLUIDOS = new Set(['AuthController', 'LogsController']);

const ACCION_POR_METODO: Record<string, AccionLog> = {
  GET: 'BUSCAR',
  POST: 'CREAR',
  PUT: 'MODIFICAR',
  PATCH: 'MODIFICAR',
  DELETE: 'ELIMINAR',
};

function moduloDeControlador(nombre: string): string {
  return nombre
    .replace(/Controller$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

@Injectable()
export class LogActividadInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const controllerName = context.getClass().name;
    const request = context.switchToHttp().getRequest();
    const accion = ACCION_POR_METODO[request.method as string];

    if (!accion || CONTROLLERS_EXCLUIDOS.has(controllerName)) {
      return next.handle();
    }

    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      return next.handle();
    }

    const modulo = moduloDeControlador(controllerName);
    const entidadIdParam = request.params?.id as string | undefined;
    const ip = obtenerIpCliente(request);

    return next.handle().pipe(
      tap((respuesta: unknown) => {
        const entidadId =
          entidadIdParam ??
          (respuesta && typeof respuesta === 'object' && 'id' in respuesta
            ? String((respuesta as { id: unknown }).id)
            : undefined);
        this.logsService.registrar({
          agenciaId: user.agenciaId,
          usuarioId: user.userId,
          usuarioEmail: user.email,
          accion,
          modulo,
          entidadId,
          ip,
        });
      }),
    );
  }
}
