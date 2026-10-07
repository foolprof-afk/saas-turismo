// Regla de negocio (PRD Guatetur Front Office, carrito "Mi viaje"): el tiempo acumulado del
// carrito se muestra en días, calculado a partir de Servicio.duracionMin de cada servicio
// agregado:
//   - duracionMin < 300 (5 horas)  -> 0.5 día (medio día)
//   - duracionMin >= 300 (5 horas) -> 1 día completo
// Si el servicio no tiene duracionMin cargado (campo opcional en el mantenedor), se asume 1 día
// completo como valor conservador por defecto. [Decisión pendiente de aprobación: confirmar si
// este fallback de "1 día" para servicios sin duración cargada es el comportamiento deseado, o
// si en su lugar se prefiere excluirlos del cálculo de días / forzar a cargar la duración antes
// de publicar el servicio.]
const MINUTOS_MEDIO_DIA = 5 * 60;

export function diasPorServicio(duracionMin?: number | null): number {
  if (duracionMin == null) return 1;
  return duracionMin < MINUTOS_MEDIO_DIA ? 0.5 : 1;
}

// Suma los días de una lista de duraciones (una por cada servicio en el carrito). No deduplica
// por día calendario: en este MVP el carrito no asigna servicios a días específicos del
// itinerario, así que el total es simplemente la suma de la contribución de cada servicio (ver
// PRD, distinción entre "Subtotal de tours" y "Total del viaje").
export function totalDias(duraciones: (number | null | undefined)[]): number {
  return duraciones.reduce((acc: number, d) => acc + diasPorServicio(d), 0);
}

// Texto corto para mostrar en tarjetas/badges (ej. "Medio día", "1 día", "3.5 días").
export function formatDias(dias: number): string {
  if (dias === 0.5) return "Medio día";
  if (dias === 1) return "1 día";
  const texto = dias % 1 === 0 ? String(dias) : dias.toFixed(1);
  return `${texto} días`;
}
