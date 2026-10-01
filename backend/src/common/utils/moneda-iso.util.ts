/**
 * El campo Moneda.codigo es texto libre definido por cada agencia (ej. "QUETZAL" en vez del
 * código ISO "GTQ"), ya que se usa tal cual para mostrarlo en reportes, vouchers, etc. Las
 * pasarelas de pago (ej. Recurrente) sí exigen el código ISO 4217 exacto, así que esta función
 * normaliza los alias más comunes antes de validar/enviar la moneda a un PasarelaProvider.
 */
const ALIAS_A_ISO: Record<string, string> = {
  QUETZAL: 'GTQ',
  QUETZALES: 'GTQ',
  GTQ: 'GTQ',
  Q: 'GTQ',
  DOLAR: 'USD',
  DOLARES: 'USD',
  'DÓLAR': 'USD',
  'DÓLARES': 'USD',
  USD: 'USD',
  'US$': 'USD',
};

export function normalizarCodigoIso(codigo: string): string {
  const limpio = codigo
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return ALIAS_A_ISO[limpio] ?? limpio;
}
