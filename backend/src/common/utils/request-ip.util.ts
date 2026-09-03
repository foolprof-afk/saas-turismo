import { Request } from 'express';

/**
 * Extrae la IP real del cliente, priorizando el header X-Forwarded-For (por si hay un proxy
 * reverso delante del backend). Usada tanto por el interceptor de logs como por el login.
 */
export function obtenerIpCliente(request: Request): string | undefined {
  const forwarded = request.headers?.['x-forwarded-for'];
  const valor = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof valor === 'string' && valor.length > 0) {
    return valor.split(',')[0].trim();
  }
  return request.ip ?? request.socket?.remoteAddress ?? undefined;
}
