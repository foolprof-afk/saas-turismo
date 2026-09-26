"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatFecha } from "@/lib/fecha";
import { formatMonto } from "@/lib/moneda";

interface Cotizacion {
  id: string;
  codigoCotizacion: string;
  estado: string;
  fechaServicio: string;
  cantidadPersonas: number;
  pasajeroResponsable: string;
  vendedor: { nombre: string };
  moneda?: { codigo: string; simbolo: string; tasaCambio: string } | null;
  items: { precioUnitario: string; cantidad: number; moneda: { codigo: string; simbolo: string; tasaCambio: string } }[];
}

interface Vendedor {
  id: string;
  nombre: string;
}

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "CANCELADA"];

function convertirMonto(monto: number, tasaOrigen: number, tasaDestino: number) {
  return (monto * tasaDestino) / tasaOrigen;
}

// Mismo criterio que en el detalle de la cotización (ver [id]/page.tsx): si la cotización
// tiene una moneda fijada, todas las líneas se convierten a esa moneda para dar un único
// total; si no, se agrupan por la moneda propia de cada servicio.
function totalCotizacion(c: Cotizacion) {
  if (c.moneda) {
    const tasaDestino = Number(c.moneda.tasaCambio);
    const total = c.items.reduce((acc, item) => {
      const monto = Number(item.precioUnitario) * item.cantidad;
      return acc + convertirMonto(monto, Number(item.moneda.tasaCambio), tasaDestino);
    }, 0);
    return [{ total, codigo: c.moneda.codigo, simbolo: c.moneda.simbolo }];
  }
  const porMoneda = new Map<string, { total: number; codigo: string; simbolo: string }>();
  for (const item of c.items) {
    const entry = porMoneda.get(item.moneda.codigo) ?? { total: 0, codigo: item.moneda.codigo, simbolo: item.moneda.simbolo };
    entry.total += Number(item.precioUnitario) * item.cantidad;
    porMoneda.set(item.moneda.codigo, entry);
  }
  return Array.from(porMoneda.values());
}

// Suma los totales de todas las cotizaciones actualmente listadas (sea la búsqueda por defecto
// o filtrada), agrupados por moneda, reutilizando totalCotizacion para cada fila.
function totalesLista(cotizaciones: Cotizacion[]) {
  const porMoneda = new Map<string, { total: number; codigo: string; simbolo: string }>();
  for (const c of cotizaciones) {
    for (const t of totalCotizacion(c)) {
      const entry = porMoneda.get(t.codigo) ?? { total: 0, codigo: t.codigo, simbolo: t.simbolo };
      entry.total += t.total;
      porMoneda.set(t.codigo, entry);
    }
  }
  return Array.from(porMoneda.values());
}

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [codigoCotizacion, setCodigoCotizacion] = useState("");

  const cargar = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (vendedorId) params.set("vendedorId", vendedorId);
    if (codigoCotizacion) params.set("codigoCotizacion", codigoCotizacion);
    const qs = params.toString();
    api
      .get<Cotizacion[]>(`/cotizaciones${qs ? `?${qs}` : ""}`)
      .then(setCotizaciones)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las cotizaciones"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<Vendedor[]>("/usuarios/vendedores").then(setVendedores).catch(() => null);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cotizaciones</h1>
        <Link href="/cotizaciones/nueva" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Nueva cotización
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          cargar();
        }}
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
      >
        <div>
          <label className="block text-sm font-medium">Código</label>
          <input
            value={codigoCotizacion}
            onChange={(e) => setCodigoCotizacion(e.target.value)}
            placeholder="COT-XXXXXXXX"
            className="mt-1 rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Vendedor</label>
          <select
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && cotizaciones.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4">
          <span className="text-sm font-semibold text-gray-500">Total de la lista ({cotizaciones.length}):</span>
          {totalesLista(cotizaciones).map((t) => (
            <span key={t.codigo} className="text-sm font-semibold">
              {t.simbolo} {formatMonto(t.total)} {t.codigo}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Responsable</th>
              <th className="px-4 py-2">Personas</th>
              <th className="px-4 py-2">Vendedor</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && cotizaciones.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No hay cotizaciones todavía
                </td>
              </tr>
            )}
            {cotizaciones.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/cotizaciones/${c.id}`} className="text-blue-600 hover:underline">
                    {c.codigoCotizacion}
                  </Link>
                </td>
                <td className="px-4 py-2">{c.pasajeroResponsable}</td>
                <td className="px-4 py-2">{c.cantidadPersonas}</td>
                <td className="px-4 py-2">{c.vendedor?.nombre}</td>
                <td className="px-4 py-2">{formatFecha(c.fechaServicio)}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{c.estado}</span>
                </td>
                <td className="px-4 py-2">
                  {totalCotizacion(c).map((t) => (
                    <div key={t.codigo}>
                      {t.simbolo} {formatMonto(t.total)} <span className="text-xs text-gray-400">{t.codigo}</span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
