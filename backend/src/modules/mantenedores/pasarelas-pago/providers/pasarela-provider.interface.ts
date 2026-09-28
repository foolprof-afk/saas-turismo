/**
 * Adapter que encapsula las llamadas a la API de un proveedor de pasarela de pago concreto
 * (Recurrente, y a futuro otros). PasarelaPago.proveedor elige qué adapter usar (ver registry.ts)
 * y PasarelaPago.config/urlBase llevan los datos propios de ese proveedor (claves, URLs, etc.),
 * sin que el resto del sistema necesite conocer su forma.
 */
export interface PasarelaProvider {
  /** Monedas (código ISO) que este proveedor puede cobrar. */
  monedasSoportadas: string[];

  /** Claves esperadas dentro de PasarelaPago.config, para validar el mantenedor al crear/editar. */
  camposConfigRequeridos: string[];

  crearCheckout(params: {
    urlBase: string;
    config: Record<string, unknown>;
    monto: number;
    monedaCodigo: string;
    descripcion: string;
    /** Id del LinkPago, para poder relacionar la confirmación del webhook con este link. */
    referenciaInterna: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ referenciaExterna: string; urlPago: string }>;

  /**
   * Verifica la firma del webhook y, si es válido, extrae el resultado del pago. Devuelve
   * null si la firma no es válida o el evento no corresponde a un pago confirmado.
   */
  verificarWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
    config: Record<string, unknown>;
  }): {
    referenciaExterna: string;
    referenciaInterna?: string;
    monto: number;
    monedaCodigo: string;
  } | null;
}
