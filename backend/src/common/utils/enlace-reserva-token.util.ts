import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

export interface EnlaceReservaPayload {
  reservaId: string;
  agenciaId: string;
  exp: number;
}

const DIAS_VALIDEZ = 90;

function secret(): string {
  return process.env.JWT_SECRET ?? 'dev-secret';
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Firma un token para el enlace público de una reserva (análogo a
 * enlace-cotizacion-token.util.ts), con HMAC-SHA256 y el mismo secreto del JWT de sesión. No se
 * persiste nada en BD: el enlace siempre apunta a la versión actual de la reserva, de forma que
 * un cliente que ya pasó de cotización a reserva pueda seguir revisándolo para ver cualquier
 * modificación posterior (cambio de fecha, de servicios, de estado, nuevos abonos, etc.), a
 * diferencia del voucher/QR (ver vouchers.service.ts), que expira cerca de la fecha de servicio
 * y está pensado para el check-in del día, no para seguimiento continuo.
 */
export function firmarEnlaceReserva(payload: Omit<EnlaceReservaPayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + DIAS_VALIDEZ * 24 * 60 * 60;
  const full: EnlaceReservaPayload = { ...payload, exp };
  const encoded = base64url(JSON.stringify(full));
  const signature = createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verificarEnlaceReserva(token: string): EnlaceReservaPayload {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) throw new UnauthorizedException('Enlace inválido');

  const esperada = createHmac('sha256', secret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const espBuf = Buffer.from(esperada);
  if (sigBuf.length !== espBuf.length || !timingSafeEqual(sigBuf, espBuf)) {
    throw new UnauthorizedException('Enlace inválido');
  }

  const payload: EnlaceReservaPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException('Enlace expirado');
  }
  return payload;
}
