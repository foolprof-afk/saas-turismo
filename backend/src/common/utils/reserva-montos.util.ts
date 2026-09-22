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
 * unidades de esa moneda equivalen a 1 unidad de la moneda principal (p. ej. si la moneda
 * principal es USD y 1 USD = 7.5 GTQ, la tasaCambio del GTQ es 7.5). Por eso para convertir a
 * la principal se divide por la tasaCambio de la moneda de origen y se multiplica por la
 * tasaCambio de la principal (que normalmente es 1). Si no hay moneda principal configurada,
 * no hay forma de convertir y se retorna null.
 */
export function convertirAPrincipal(
  montos: MontoPorMoneda[],
  principal: MonedaPrincipalInfo | null,
): MontoPorMoneda | null {
  if (!principal) return null;
  const total = montos.reduce((acc, m) => acc + (m.total * principal.tasaCambio) / m.tasaCambio, 0);
  return {
    monedaId: principal.id,
    monedaCodigo: principal.codigo,
    monedaSimbolo: principal.simbolo,
    tasaCambio: principal.tasaCambio,
    total,
  };
}

/**
 * Convierte un monto entre dos monedas cualquiera de la misma agencia usando su tasaCambio
 * respecto a la moneda principal (ver convertirAPrincipal para la explicación de la
 * convención). Generaliza esa fórmula a un par origen/destino arbitrario: se pasa primero a
 * la principal (dividiendo por tasaOrigen) y de ahí a la destino (multiplicando por
 * tasaDestino), lo cual es equivalente a monto * tasaDestino / tasaOrigen.
 */
export function convertirMonto(monto: number, tasaOrigen: number, tasaDestino: number): number {
  return (monto * tasaDestino) / tasaOrigen;
}

interface PagoConMoneda {
  monto: unknown;
  monedaId: string;
  moneda: MonedaInfo;
  estado: string;
}

/**
 * Suma lo efectivamente abonado a una reserva, agrupado por moneda. Solo cuentan los pagos en
 * estado PAGADO (los PENDIENTE son pagos diferidos que aún no se han cobrado). El impuesto de
 * cada pago (Pago.montoImpuesto) queda fuera de esta suma a propósito: es un cargo aparte de la
 * forma de pago, no un abono al total de la reserva.
 */
export function calcularAbonado(pagos: PagoConMoneda[]): MontoPorMoneda[] {
  const map = new Map<string, MontoPorMoneda>();
  for (const pago of pagos) {
    if (pago.estado !== 'PAGADO') continue;
    const entry = map.get(pago.monedaId) ?? {
      monedaId: pago.monedaId,
      monedaCodigo: pago.moneda.codigo,
      monedaSimbolo: pago.moneda.simbolo,
      tasaCambio: Number(pago.moneda.tasaCambio),
      total: 0,
    };
    entry.total += Number(pago.monto);
    map.set(pago.monedaId, entry);
  }
  return Array.from(map.values());
}

/**
 * Total de la reserva menos lo abonado, por moneda (nunca se mezclan montos de monedas
 * distintas). Si se abonó en una moneda que no forma parte del total de la reserva, igual se
 * incluye (como saldo negativo, es decir sobrepago informativo en esa moneda).
 */
export function calcularSaldoPendiente(montos: MontoPorMoneda[], abonado: MontoPorMoneda[]): MontoPorMoneda[] {
  const map = new Map<string, MontoPorMoneda>();
  for (const m of montos) map.set(m.monedaId, { ...m });
  for (const a of abonado) {
    const existente = map.get(a.monedaId);
    if (existente) {
      existente.total -= a.total;
    } else {
      map.set(a.monedaId, { ...a, total: -a.total });
    }
  }
  return Array.from(map.values());
}

/**
 * Impuesto de un pago según el porcentaje configurado en la forma de pago elegida
 * (FormaPago.config.impuestoPorcentaje). Se calcula sobre el monto abonado pero se registra
 * aparte (Pago.montoImpuesto): no se suma al abono ni se descuenta del saldo pendiente.
 */
export function calcularMontoImpuesto(porcentaje: number | undefined | null, monto: number): number {
  if (!porcentaje) return 0;
  return Math.round(monto * (porcentaje / 100) * 100) / 100;
}
