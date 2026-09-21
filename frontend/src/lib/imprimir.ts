/**
 * Abre una ventana nueva con una copia standalone del elemento indicado (clonando los
 * <link>/<style> de la página actual para conservar el estilo) y dispara el diálogo de
 * impresión del navegador, que el usuario puede usar para imprimir o "Guardar como PDF".
 * Se usa en documentos formales (tamaño A4) en vez de la impresión de voucher (que usa el
 * formato de recibo de 80mm definido en globals.css) para no interferir con ese flujo.
 */
export function imprimirElemento(elementId: string, titulo: string) {
  const contenido = document.getElementById(elementId);
  const ventana = window.open("", "_blank", "width=900,height=1000");
  if (!contenido || !ventana) return;

  const estilos = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join("\n");

  ventana.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${titulo}</title>
    ${estilos}
    <style>@page { size: A4; margin: 15mm; } body { padding: 20px; }</style>
  </head>
  <body>${contenido.innerHTML}</body>
</html>`);
  ventana.document.close();

  const imprimir = () => {
    ventana.focus();
    ventana.print();
  };
  if (ventana.document.readyState === "complete") {
    imprimir();
  } else {
    ventana.onload = imprimir;
  }
}
