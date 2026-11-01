// Exporta filas (un objeto por fila, claves = encabezados de columna) a un archivo CSV y
// dispara la descarga en el navegador. Usado como respaldo descargable de listados filtrados
// (cotizaciones, reservas, órdenes de servicio): exporta exactamente lo que el usuario está
// viendo en pantalla con los filtros aplicados.
export function descargarCsv(nombreArchivo: string, filas: Record<string, string | number>[]) {
  if (filas.length === 0) return;
  const columnas = Object.keys(filas[0]);
  const escapar = (valor: string | number) => {
    const texto = String(valor ?? "");
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const lineas = [columnas.join(","), ...filas.map((fila) => columnas.map((c) => escapar(fila[c])).join(","))];
  // BOM al inicio para que Excel detecte UTF-8 y no rompa tildes/ñ.
  const contenido = "\uFEFF" + lineas.join("\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
