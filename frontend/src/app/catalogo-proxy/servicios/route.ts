import { NextResponse } from "next/server";
import { catalogoFetch } from "@/lib/catalogo/backend-client";

// Proxy público de solo lectura hacia GET /servicios, autenticado como usuario.web (rol
// catalogo_web). El backend ya filtra por agencia + estado ACTIVO + estadoPublicacion PUBLICO
// para este rol (ver ServiciosService.whereCatalogo), así que aquí no se repite ese filtro.
// limit alto porque el catálogo público se muestra como grilla completa, no paginada.
//
// IMPORTANTE: esta ruta vive fuera de /api/ a propósito. En producción, nginx reenvía todo
// /api/* directamente al backend NestJS (puerto 3000, ver /etc/nginx/sites-enabled/
// turismoasociados.online), sin pasar por este contenedor de Next.js, así que cualquier Route
// Handler bajo app/api/** nunca sería alcanzado por el navegador en el dominio público.
export async function GET() {
  const res = await catalogoFetch("/servicios?limit=200");
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Error al cargar el catálogo" }));
    return NextResponse.json(body, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
