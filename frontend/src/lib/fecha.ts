// Las fechas "de solo día" (fechaServicio, fechaServicioInicio/Fin, dia.fecha, etc.) se generan
// en el backend a partir del string "YYYY-MM-DD" del input, que JS interpreta como medianoche
// UTC. Si se formatean con toLocaleDateString() (hora local del navegador), en zonas horarias
// detrás de UTC (ej. Centroamérica, UTC-6) esa medianoche cae en la tarde del día anterior y se
// muestra un día antes del seleccionado. Esta función formatea usando UTC para mostrar siempre
// el día que realmente se seleccionó, sin importar la zona horaria del navegador.
export function formatFecha(value: string | Date): string {
  const fecha = typeof value === "string" ? new Date(value) : value;
  return fecha.toLocaleDateString(undefined, { timeZone: "UTC" });
}

// Devuelve la fecha de HOY en formato "YYYY-MM-DD" según la hora local del navegador. No usar
// new Date().toISOString().slice(0, 10): eso da la fecha en UTC, que cerca de medianoche en
// zonas horarias detrás de UTC (ej. Centroamérica) puede adelantarse un día.
export function hoyLocal(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
