interface MonedaInfo {
  codigo: string;
  simbolo: string;
  tasaCambio: unknown;
}

interface ItinerarioServicioConMoneda {
  precio: unknown;
  monedaId: string | null;
  moneda: MonedaInfo | null;
}

interface ReservaConMontos {
  tipo: string;
  total: unknown;
  monedaId: string | null;
  moneda: MonedaInfo | null;
  itinerario?: { dias: { servicios: ItinerarioServicioConMoneda[] }[] } | null;
}

export interface MontoPorMoneda {
  monedaId: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  tasaCambio: number;
  total: number;
}

export interface MonedaPrincipalInfo {
  id: string;
  codigo: string;
  simbolo: string;
  tasaCambio: number;
}

/**
 * Desglosa el monto de una reserva por moneda. Para reservas MULTIPLE (varios servicios,
 * cada uno potencialmente en una moneda distinta) se agrupa por la moneda de cada línea del
 * itinerario; para el resto se usa el total/moneda únicos de la reserva. Nunca se suman
 * montos de monedas distintas en un solo número.
 */
export function desglosePorMoneda(reserva: ReservaConMontos): MontoPorMoneda[] {
  if (reserva.tipo === 'MULTIPLE') {
    const map = new Map<string, MontoPorMoneda>();
    const lineas = reserva.itinerario?.dias.flatMap((d) => d.servicios) ?? [];
    for (const linea of lineas) {
      if (linea.precio === null || linea.precio === undefined || !linea.moneda || !linea.monedaId) continue;
      const entry = map.get(linea.monedaId) ?? {
        monedaId: linea.monedaId,
        monedaCodigo: linea.moneda.codigo,
        monedaSimbolo: linea.moneda.simbolo,
        tasaCambio: Number(linea.moneda.tasaCambio),
        total: 0,
      };
      entry.total += Number(linea.precio);
      map.set(linea.monedaId, entry);
    }
    return Array.from(map.values());
  }

  if (reserva.total !== null && reserva.total !== undefined && reserva.moneda && reserva.monedaId) {
    return [
      {
        monedaId: reserva.monedaId,
        monedaCodigo: reserva.moneda.codigo,
        monedaSimbolo: reserva.moneda.simbolo,
        tasaCambio: Number(reserva.moneda.tasaCambio),
        total: Number(reserva.total),
      },
    ];
  }

  return [];
}

/**
 * Convierte una lista de montos por moneda a un único total expresado en la moneda principal
 * de la agencia (Moneda.esPrincipal = true). tasaCambio de cada moneda representa cuántas
 * unidades de la moneda principal equivalen a 1 unidad de esa moneda (p. ej. si la moneda
 * principal es GTQ y 1 USD = 7.75 GTQ, la tasaCambio del USD es 7.75). Se divide también por
 * la tasaCambio de la moneda principal por si no está exactamente en 1. Si no hay moneda
 * principal configurada, no hay forma de convertir y se retorna null.
 */
export function convertirAPrincipal(
  montos: MontoPorMoneda[],
  principal: MonedaPrincipalInfo | null,
): MontoPorMoneda | null {
  if (!principal) return null;
  const total = montos.reduce((acc, m) => acc + (m.total * m.tasaCambio) / principal.tasaCambio, 0);
  return {
    monedaId: principal.id,
    monedaCodigo: principal.codigo,
    monedaSimbolo: principal.simbolo,
    tasaCambio: principal.tasaCambio,
    total,
  };
}
