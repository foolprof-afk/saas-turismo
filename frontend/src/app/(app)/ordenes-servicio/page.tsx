"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatFecha } from "@/lib/fecha";

interface Opcion {
  id: string;
  nombre: string;
}

interface OrdenServicioItem {
  cantidad: number;
  precioCosto: string;
  fechaServicio: string;
  moneda: { codigo: string; simbolo: string };
}

interface OrdenServicio {
  id: string;
  codigoOrden: string;
  estado: string;
  fechaEmision: string;
  proveedor: { nombre: string };
  items: OrdenServicioItem[];
}

function totalOrden(orden: OrdenServicio) {
  const porMoneda = new Map<string, { total: number; simbolo: string }>();
  for (const item of orden.items) {
    const entry = porMoneda.get(item.moneda.codigo) ?? { total: 0, simbolo: item.moneda.simbolo };
    entry.total += Number(item.precioCosto) * item.cantidad;
    porMoneda.set(item.moneda.codigo, entry);
  }
  return Array.from(porMoneda.entries()).map(([codigo, v]) => ({ codigo, ...v }));
}

// Una orden puede agrupar servicios en fechas distintas; se muestra el rango completo.
function rangoFechas(orden: OrdenServicio) {
  if (orden.items.length === 0) return "-";
  const fechas = orden.items.map((i) => i.fechaServicio).sort();
  const min = formatFecha(fechas[0]);
  const max = formatFecha(fechas[fechas.length - 1]);
  return min === max ? min : `${min} – ${max}`;
}

export default function OrdenesServicioPage() {
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [proveedores, setProveedores] = useState<Opcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [proveedorId, setProveedorId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [codigoOrden, setCodigoOrden] = useState("");

  const cargar = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (proveedorId) params.set("proveedorId", proveedorId);
    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (codigoOrden) params.set("codigoOrden", codigoOrden);
    params.set("limit", "200");
    api
      .get<OrdenServicio[]>(`/ordenes-servicio?${params.toString()}`)
      .then(setOrdenes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las órdenes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<Opcion[]>("/proveedores").then(setProveedores).catch(() => null);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Órdenes de servicio</h1>
        <Link href="/ordenes-servicio/nueva" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Nueva orden
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        Documento que se envía a un proveedor para pedirle que ejecute uno o más servicios a un precio costo pactado.
      </p>

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
            value={codigoOrden}
            onChange={(e) => setCodigoOrden(e.target.value)}
            placeholder="OS-XXXXXXXX"
            className="mt-1 rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Proveedor</label>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          />
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

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Fecha servicio</th>
              <th className="px-4 py-2">Emisión</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && ordenes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No hay órdenes de servicio todavía
                </td>
              </tr>
            )}
            {ordenes.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/ordenes-servicio/${o.id}`} className="text-blue-600 hover:underline">
                    {o.codigoOrden}
                  </Link>
                </td>
                <td className="px-4 py-2">{o.proveedor?.nombre}</td>
                <td className="px-4 py-2">{rangoFechas(o)}</td>
                <td className="px-4 py-2">{new Date(o.fechaEmision).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      o.estado === "ANULADA" ? "bg-red-100 text-red-700" : "bg-gray-100"
                    }`}
                  >
                    {o.estado}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {totalOrden(o).map((t) => (
                    <div key={t.codigo}>
                      {t.simbolo} {t.total.toFixed(2)} <span className="text-xs text-gray-400">{t.codigo}</span>
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
