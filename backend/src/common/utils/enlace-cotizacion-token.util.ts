import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

export interface EnlaceCotizacionPayload {
  cotizacionId: string;
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
 * Firma un token para el enlace público de una cotización (usado en el código QR), con
 * HMAC-SHA256 y el mismo secreto del JWT de sesión. No se persiste nada en BD: el QR sigue
 * apuntando siempre a la versión actual de la cotización, aunque se edite después de generarlo.
 */
export function firmarEnlaceCotizacion(payload: Omit<EnlaceCotizacionPayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + DIAS_VALIDEZ * 24 * 60 * 60;
  const full: EnlaceCotizacionPayload = { ...payload, exp };
  const encoded = base64url(JSON.stringify(full));
  const signature = createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verificarEnlaceCotizacion(token: string): EnlaceCotizacionPayload {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) throw new UnauthorizedException('Enlace inválido');

  const esperada = createHmac('sha256', secret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const espBuf = Buffer.from(esperada);
  if (sigBuf.length !== espBuf.length || !timingSafeEqual(sigBuf, espBuf)) {
    throw new UnauthorizedException('Enlace inválido');
  }

  const payload: EnlaceCotizacionPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException('Enlace expirado');
  }
  return payload;
}
