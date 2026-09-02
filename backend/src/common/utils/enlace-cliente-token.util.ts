import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

export interface EnlaceClientePayload {
  clienteId: string;
  agenciaId: string;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  exp: number;
}

const DIAS_VALIDEZ = 30;

function secret(): string {
  return process.env.JWT_SECRET ?? 'dev-secret';
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Firma un token para el enlace público del cuadre de un cliente (usado en "Enviar cuadre"),
 * usando HMAC-SHA256 con el mismo secreto del JWT de sesión. No requiere persistir nada en BD.
 */
export function firmarEnlaceCliente(payload: Omit<EnlaceClientePayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + DIAS_VALIDEZ * 24 * 60 * 60;
  const full: EnlaceClientePayload = { ...payload, exp };
  const encoded = base64url(JSON.stringify(full));
  const signature = createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verificarEnlaceCliente(token: string): EnlaceClientePayload {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) throw new UnauthorizedException('Enlace inválido');

  const esperada = createHmac('sha256', secret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const espBuf = Buffer.from(esperada);
  if (sigBuf.length !== espBuf.length || !timingSafeEqual(sigBuf, espBuf)) {
    throw new UnauthorizedException('Enlace inválido');
  }

  const payload: EnlaceClientePayload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException('Enlace expirado');
  }
  return payload;
}
