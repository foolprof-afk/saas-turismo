// Cliente de backend SOLO para uso en el servidor (Route Handlers bajo app/catalogo-proxy/*).
// Nunca importar este archivo desde un componente "use client": usa variables de entorno sin
// el prefijo NEXT_PUBLIC_ para que las credenciales de usuario.web no lleguen nunca al bundle
// del navegador. Solo se importa desde Route Handlers (app/catalogo-proxy/**/route.ts), que
// siempre corren en el servidor.
//
// Autentica como el usuario restringido "usuario.web" (rol catalogo_web, ver
// permisos.util.ts / PRD Guatetur Front Office) y cachea el JWT en memoria del proceso,
// reintentando el login una sola vez si el backend responde 401 (token vencido/inválido).

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3000";
const CATALOGO_WEB_EMAIL = process.env.CATALOGO_WEB_EMAIL ?? "";
const CATALOGO_WEB_PASSWORD = process.env.CATALOGO_WEB_PASSWORD ?? "";
const CATALOGO_WEB_AGENCIA_SLUG = process.env.CATALOGO_WEB_AGENCIA_SLUG ?? "guatetur";

let tokenCacheado: string | null = null;
let loginEnCurso: Promise<string> | null = null;

export class CatalogoBackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function login(): Promise<string> {
  if (!CATALOGO_WEB_EMAIL || !CATALOGO_WEB_PASSWORD) {
    throw new CatalogoBackendError(
      500,
      "El catálogo web no está configurado (faltan CATALOGO_WEB_EMAIL / CATALOGO_WEB_PASSWORD)",
    );
  }
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: CATALOGO_WEB_EMAIL,
      password: CATALOGO_WEB_PASSWORD,
      agenciaSlug: CATALOGO_WEB_AGENCIA_SLUG,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new CatalogoBackendError(502, "No se pudo autenticar el catálogo web con el backend");
  }
  const body = await res.json();
  tokenCacheado = body.accessToken as string;
  return tokenCacheado;
}

async function obtenerToken(): Promise<string> {
  if (tokenCacheado) return tokenCacheado;
  if (!loginEnCurso) {
    loginEnCurso = login().finally(() => {
      loginEnCurso = null;
    });
  }
  return loginEnCurso;
}

/**
 * Hace una petición autenticada al backend real como usuario.web, reintentando el login una
 * vez si la primera respuesta es 401 (token cacheado vencido o revocado).
 */
export async function catalogoFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let token = await obtenerToken();
  let res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    tokenCacheado = null;
    token = await obtenerToken();
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      cache: "no-store",
    });
  }

  return res;
}
