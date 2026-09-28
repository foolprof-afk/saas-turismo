import { PasarelaProvider } from './pasarela-provider.interface';
import { recurrenteProvider } from './recurrente.provider';

/**
 * Registro de adapters disponibles por proveedor. Para agregar un nuevo proveedor de pasarela
 * de pago (además de Recurrente) basta con implementar PasarelaProvider y agregarlo aquí: el
 * resto del sistema (mantenedor, generación de links, webhook) ya funciona de forma genérica.
 */
export const PROVEEDORES_PASARELA_PAGO: Record<string, PasarelaProvider> = {
  recurrente: recurrenteProvider,
};

export function obtenerProvider(proveedor: string): PasarelaProvider | undefined {
  return PROVEEDORES_PASARELA_PAGO[proveedor];
}
