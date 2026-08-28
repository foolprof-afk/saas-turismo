"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Reserva {
  id: string;
  codigoReserva: string;
  estado: string;
  fechaServicioInicio: string;
  total: string;
  cliente: { nombre: string };
  vendedor: { nombre: string };
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Reserva[]>("/reservas")
      .then(setReservas)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <Link href="/reservas/nueva" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Nueva reserva
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Vendedor</th>
              <th className="px-4 py-2">Fecha</th>
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
            {!loading && reservas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No hay reservas todavía
                </td>
              </tr>
            )}
            {reservas.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2 font-mono">{r.codigoReserva}</td>
                <td className="px-4 py-2">{r.cliente?.nombre}</td>
                <td className="px-4 py-2">{r.vendedor?.nombre}</td>
                <td className="px-4 py-2">{new Date(r.fechaServicioInicio).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{r.estado}</span>
                </td>
                <td className="px-4 py-2">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
