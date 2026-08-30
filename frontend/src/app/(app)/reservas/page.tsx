"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

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
  cliente: { nombre: string };
  vendedor: { nombre: string };
  pasajeros: { nombre: string; telefono?: string | null }[];
}

interface Vendedor {
  id: string;
  nombre: string;
}

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "OPERADA", "CANCELADA"];

function MontoCelda({ reserva }: { reserva: Reserva }) {
  if (!reserva.montos || reserva.montos.length === 0) {
    return <span className="text-gray-400">-</span>;
  }
  return (
    <div className="space-y-0.5">
      {reserva.montos.map((m) => (
        <div key={m.monedaId}>
          {m.monedaSimbolo} {m.total.toFixed(2)} <span className="text-xs text-gray-400">{m.monedaCodigo}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [codigoReserva, setCodigoReserva] = useState("");

  const cargar = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (vendedorId) params.set("vendedorId", vendedorId);
    if (codigoReserva) params.set("codigoReserva", codigoReserva);
    const qs = params.toString();
    api
      .get<Reserva[]>(`/reservas${qs ? `?${qs}` : ""}`)
      .then(setReservas)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<Vendedor[]>("/usuarios/vendedores").then(setVendedores).catch(() => null);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
  }, [estado, vendedorId, codigoReserva]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <Link href="/reservas/nueva" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Nueva reserva
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
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
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Titular</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Vendedor</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Monto</th>
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
            {!loading && reservas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
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
                <td className="px-4 py-2">{new Date(r.fechaServicioInicio).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{r.estado}</span>
                </td>
                <td className="px-4 py-2">
                  <MontoCelda reserva={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
