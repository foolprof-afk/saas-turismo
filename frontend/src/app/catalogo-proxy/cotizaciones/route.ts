import { NextResponse } from "next/server";
import { catalogoFetch } from "@/lib/catalogo/backend-client";

// Proxy público hacia POST /cotizaciones, autenticado como usuario.web (rol catalogo_web).
// El backend exige emailResponsable + telefonoResponsable para este rol y marca
// Cotizacion.origen = 'AUTOSERVICIO_WEB' automáticamente (ver CotizacionesService.create).
//
// IMPORTANTE: fuera de /api/ a propósito, ver nota en catalogo-proxy/servicios/route.ts
// (nginx reenvía /api/* directo al backend, sin pasar por este contenedor de Next.js).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const res = await catalogoFetch("/cotizaciones", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ message: "Respuesta inválida del backend" }));
  return NextResponse.json(data, { status: res.status });
}
