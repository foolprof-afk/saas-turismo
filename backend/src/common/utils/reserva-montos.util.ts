interface MonedaInfo {
  codigo: string;
  simbolo: string;
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
  total: number;
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
        total: Number(reserva.total),
      },
    ];
  }

  return [];
}
