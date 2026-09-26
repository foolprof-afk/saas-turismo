"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatFecha } from "@/lib/fecha";
import { formatMonto } from "@/lib/moneda";

interface MontoPorMoneda {
  monedaId: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  total: number;
}

interface Reserva {
  id: string;
  codigoReserva: string;
  estado: string;
  fechaServicioInicio: string;
  total: string | null;
  moneda?: { codigo: string; simbolo: string } | null;
  montos: MontoPorMoneda[];
  totalPrincipal: MontoPorMoneda | null;
  cliente: { nombre: string };
  vendedor: { nombre: string };
  pasajeros: { nombre: string; telefono?: string | null }[];
}

interface Vendedor {
  id: string;
  nombre: string;
}

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "OPERADA", "CANCELADA"];

// Suma los montos de todas las reservas actualmente listadas (sea la búsqueda por defecto o
// filtrada), agrupados por moneda: r.montos ya trae el monto real de cada reserva en su propia
// moneda, y r.totalPrincipal el equivalente convertido a la moneda predeterminada de la agencia.
function totalesLista(reservas: Reserva[]) {
  const porMoneda = new Map<string, { total: number; codigo: string; simbolo: string }>();
  for (const r of reservas) {
    for (const m of r.montos ?? []) {
      const entry = porMoneda.get(m.monedaCodigo) ?? { total: 0, codigo: m.monedaCodigo, simbolo: m.monedaSimbolo };
      entry.total += m.total;
      porMoneda.set(m.monedaCodigo, entry);
    }
  }
  return Array.from(porMoneda.values());
}

function totalPrincipalLista(reservas: Reserva[]) {
  const porMoneda = new Map<string, { total: number; codigo: string; simbolo: string }>();
  for (const r of reservas) {
    if (!r.totalPrincipal) continue;
    const entry = porMoneda.get(r.totalPrincipal.monedaCodigo) ?? {
      total: 0,
      codigo: r.totalPrincipal.monedaCodigo,
      simbolo: r.totalPrincipal.monedaSimbolo,
    };
    entry.total += r.totalPrincipal.total;
    porMoneda.set(r.totalPrincipal.monedaCodigo, entry);
  }
  return Array.from(porMoneda.values());
}

function MontoCelda({ reserva }: { reserva: Reserva }) {
  if (!reserva.montos || reserva.montos.length === 0) {
    return <span className="text-gray-400">-</span>;
  }
  const p = reserva.totalPrincipal;
  const mostrarEquivalente = p && (reserva.montos.length > 1 || reserva.montos[0]?.monedaId !== p.monedaId);
  return (
    <div className="space-y-0.5">
      {reserva.montos.map((m) => (
        <div key={m.monedaId}>
          {m.monedaSimbolo} {formatMonto(m.total)} <span className="text-xs text-gray-400">{m.monedaCodigo}</span>
        </div>
      ))}
      {mostrarEquivalente && (
        <div className="text-xs text-gray-400">
          ≈ {p!.monedaSimbolo}
          {formatMonto(p!.total)} {p!.monedaCodigo}
        </div>
      )}
    </div>
  );
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [codigoReserva, setCodigoReserva] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const cargar = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (vendedorId) params.set("vendedorId", vendedorId);
    if (codigoReserva) params.set("codigoReserva", codigoReserva);
    if (fechaInicio) params.set("fechaInicio", fechaInicio);
    if (fechaFin) params.set("fechaFin", fechaFin);
    const qs = params.toString();
    api
      .get<Reserva[]>(`/reservas${qs ? `?${qs}` : ""}`)
      .then(setReservas)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las reservas"))
      .finally(() => setLoading(false));
  };

  const limpiarFiltros = () => {
    setEstado("");
    setVendedorId("");
    setCodigoReserva("");
    setFechaInicio("");
    setFechaFin("");
  };

  useEffect(() => {
    api.get<Vendedor[]>("/usuarios/vendedores").then(setVendedores).catch(() => null);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <Link href="/reservas/nueva" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Nueva reserva
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
          <label className="block text-sm font-medium">Código de reserva</label>
          <input
            value={codigoReserva}
            onChange={(e) => setCodigoReserva(e.target.value)}
            placeholder="RES-XXXXXXXX"
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
        <div>
          <label className="block text-sm font-medium">Fecha inicial</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha final</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
          <button
            type="button"
            onClick={() => {
              limpiarFiltros();
              setTimeout(cargar, 0);
            }}
            className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && reservas.length > 0 && (() => {
        const totalPrincipal = totalPrincipalLista(reservas);
        const porMoneda = totalesLista(reservas);
        return (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4">
            <span className="text-sm font-semibold text-gray-500">Total de la lista ({reservas.length}):</span>
            {totalPrincipal.map((t) => (
              <span key={t.codigo} className="text-sm font-semibold">
                {t.simbolo} {formatMonto(t.total)} {t.codigo}
              </span>
            ))}
            {(totalPrincipal.length === 0 || porMoneda.length > 1) &&
              porMoneda.map((t) => (
                <span key={t.codigo} className="text-xs text-gray-400">
                  {t.simbolo} {formatMonto(t.total)} {t.codigo}
                </span>
              ))}
          </div>
        );
      })()}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Titular</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Vendedor</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && reservas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  No hay reservas todavía
                </td>
              </tr>
            )}
            {reservas.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/reservas/${r.id}`} className="text-blue-600 hover:underline">
                    {r.codigoReserva}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.pasajeros?.[0]?.nombre ?? r.cliente?.nombre}</td>
                <td className="px-4 py-2">{r.pasajeros?.[0]?.telefono ?? "-"}</td>
                <td className="px-4 py-2">{r.vendedor?.nombre}</td>
                <td className="px-4 py-2">{formatFecha(r.fechaServicioInicio)}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{r.estado}</span>
                </td>
                <td className="px-4 py-2">
                  <MontoCelda reserva={r} />
                </td>
                <td className="px-4 py-2">
                  {r.estado === "PENDIENTE" && (
                    <Link href={`/reservas/${r.id}/editar`} className="text-blue-600 hover:underline">
                      Editar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
