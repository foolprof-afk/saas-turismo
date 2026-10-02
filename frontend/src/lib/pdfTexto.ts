// jsPDF usa las fuentes estándar (helvetica/times/courier), que solo soportan el subconjunto
// WinAnsi/Latin-1 de Unicode. Texto con caracteres fuera de ese rango —flechas, viñetas,
// comillas tipográficas, o "texto bonito" en negrita/cursiva Unicode copiado de generadores de
// texto para WhatsApp (ej. 𝗣𝗮𝗾𝘂𝗲𝘁𝗲)— se renderiza como símbolos corruptos en el PDF
// generado. Esta función normaliza y limpia el texto antes de insertarlo con doc.text(), sin
// afectar cómo se muestra ese mismo texto en la página web ni en el voucher público (que sí
// soportan Unicode completo vía HTML).
const REEMPLAZOS: [RegExp, string][] = [
  [/[➔➜➢➤➣➥→⇒]/g, "->"],
  [/[•◦▪▸‣●○]/g, "-"],
  [/[""]/g, '"'],
  [/['']/g, "'"],
  [/[–—]/g, "-"],
  [/…/g, "..."],
];

export function limpiarPdf(texto: string | null | undefined): string {
  if (!texto) return "";
  // normalize("NFKC") convierte variantes "de fuente" de Unicode (como las letras en negrita
  // matemática U+1D400+) de vuelta a sus letras Latinas equivalentes, preservando los acentos
  // normales del español (á, é, í, ó, ú, ñ) que sí están en Latin-1.
  let limpio = texto.normalize("NFKC");
  for (const [patron, reemplazo] of REEMPLAZOS) {
    limpio = limpio.replace(patron, reemplazo);
  }
  // Cualquier carácter restante fuera de Latin-1 (lo que soportan las fuentes estándar de
  // jsPDF) se descarta para evitar que se renderice como símbolos corruptos.
  return limpio.replace(/[^\u0000-\u00FF\n]/g, "");
}
