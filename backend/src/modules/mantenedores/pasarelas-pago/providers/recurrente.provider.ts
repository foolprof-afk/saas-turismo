import { createHmac, timingSafeEqual } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { PasarelaProvider } from './pasarela-provider.interface';

interface RecurrenteConfig {
  secretKey?: string;
  webhookSecret?: string;
}

const URL_BASE_DEFECTO = 'https://app.recurrente.com/api';

/**
 * Adapter para Recurrente.com (https://docs.recurrente.com). Autenticación por header
 * X-SECRET-KEY; checkouts vía POST /checkouts; confirmación de pago vía webhook firmado con
 * el esquema de Svix (svix-id/svix-timestamp/svix-signature, HMAC-SHA256).
 */
export const recurrenteProvider: PasarelaProvider = {
  monedasSoportadas: ['GTQ', 'USD'],
  camposConfigRequeridos: ['secretKey', 'webhookSecret'],

  async crearCheckout({ urlBase, config, monto, monedaCodigo, descripcion, referenciaInterna, successUrl, cancelUrl }) {
    const { secretKey } = config as RecurrenteConfig;
    if (!secretKey) throw new BadRequestException('La pasarela Recurrente no tiene configurada la secretKey');

    const respuesta = await fetch(`${urlBase || URL_BASE_DEFECTO}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SECRET-KEY': secretKey,
      },
      body: JSON.stringify({
        items: [
          {
            name: descripcion,
            amount_in_cents: Math.round(monto * 100),
            currency: monedaCodigo,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { linkPagoId: referenciaInterna },
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      throw new BadRequestException(`Recurrente rechazó la creación del checkout: ${detalle || respuesta.statusText}`);
    }

    const data = (await respuesta.json()) as { id: string; checkout_url: string };
    return { referenciaExterna: data.id, urlPago: data.checkout_url };
  },

  verificarWebhook({ headers, rawBody, config }) {
    const { webhookSecret } = config as RecurrenteConfig;
    if (!webhookSecret) return null;

    const svixId = normalizarHeader(headers['svix-id']);
    const svixTimestamp = normalizarHeader(headers['svix-timestamp']);
    const svixSignature = normalizarHeader(headers['svix-signature']);
    if (!svixId || !svixTimestamp || !svixSignature) return null;

    const secretBytes = Buffer.from(webhookSecret.replace(/^whsec_/, ''), 'base64');
    const contenidoFirmado = `${svixId}.${svixTimestamp}.${rawBody}`;
    const esperada = createHmac('sha256', secretBytes).update(contenidoFirmado).digest('base64');
    const esperadaBuf = Buffer.from(esperada, 'base64');

    const firmaValida = svixSignature
      .split(' ')
      .map((parte) => parte.split(',')[1])
      .filter(Boolean)
      .some((firma) => {
        const firmaBuf = Buffer.from(firma, 'base64');
        return firmaBuf.length === esperadaBuf.length && timingSafeEqual(firmaBuf, esperadaBuf);
      });
    if (!firmaValida) return null;

    let payload: {
      type?: string;
      status?: string;
      amount_in_cents?: number;
      currency?: string;
      checkout?: { id?: string; status?: string; metadata?: { linkPagoId?: string } };
      metadata?: { linkPagoId?: string };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const pagado = payload.type === 'payment' && payload.status === 'succeeded';
    if (!pagado || !payload.checkout?.id || payload.amount_in_cents === undefined || !payload.currency) return null;

    return {
      referenciaExterna: payload.checkout.id,
      referenciaInterna: payload.checkout.metadata?.linkPagoId ?? payload.metadata?.linkPagoId,
      monto: payload.amount_in_cents / 100,
      monedaCodigo: payload.currency,
    };
  },
};

function normalizarHeader(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
