// Formatea un monto monetario con separador de miles (punto) y decimales (coma), estilo
// Guatemala (es-GT), siempre con 2 decimales. Usar en vez de Number(x).toFixed(2) en cualquier
// lugar donde se muestre un monto de dinero.
export function formatMonto(value: number | string): string {
  const numero = typeof value === "string" ? Number(value) : value;
  return numero.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
