import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from 'crypto';

export interface QrCheckinPayload {
  typ: 'checkin';
  sub: string; // reservaId (Fase 1: un QR por reserva, ver diseno-qr-checkin.md)
  agenciaId: string;
  iat: number;
  exp: number;
}

/**
 * Firma y valida el JWT embebido en el QR del voucher, usando RS256
 * para permitir validación offline en el punto de operación (ver diseno-qr-checkin.md).
 */
@Injectable()
export class QrTokenService implements OnModuleInit {
  private privateKey: string;
  private publicKey: string;

  onModuleInit() {
    const privatePath = process.env.QR_JWT_PRIVATE_KEY_PATH ?? './keys/qr-private.pem';
    const publicPath = process.env.QR_JWT_PUBLIC_KEY_PATH ?? './keys/qr-public.pem';

    if (!existsSync(privatePath) || !existsSync(publicPath)) {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      });
      mkdirSync(dirname(privatePath), { recursive: true });
      writeFileSync(privatePath, privateKey);
      writeFileSync(publicPath, publicKey);
    }

    this.privateKey = readFileSync(privatePath, 'utf8');
    this.publicKey = readFileSync(publicPath, 'utf8');
  }

  private base64url(input: Buffer | string): string {
    return Buffer.from(input).toString('base64url');
  }

  sign(payload: Omit<QrCheckinPayload, 'iat' | 'exp' | 'typ'>, expiresInSeconds: number): string {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: QrCheckinPayload = {
      ...payload,
      typ: 'checkin',
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = this.base64url(JSON.stringify(header));
    const encodedPayload = this.base64url(JSON.stringify(fullPayload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = cryptoSign('RSA-SHA256', Buffer.from(signingInput), this.privateKey).toString(
      'base64url',
    );

    return `${signingInput}.${signature}`;
  }

  verify(token: string): QrCheckinPayload {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('QR inválido');
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const isValid = cryptoVerify(
      'RSA-SHA256',
      Buffer.from(signingInput),
      this.publicKey,
      Buffer.from(signature, 'base64url'),
    );
    if (!isValid) {
      throw new UnauthorizedException('QR inválido o adulterado');
    }

    const payload: QrCheckinPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('QR expirado');
    }

    return payload;
  }
}
