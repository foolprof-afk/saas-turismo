"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface TotalPorMoneda {
  monedaId: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  tasaCambio: number;
  total: number;
  cantidad: number;
}

interface MonedaPrincipal {
  id: string;
  codigo: string;
  simbolo: string;
  tasaCambio: number;
}

interface TotalGeneral {
  monedaId: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  total: number;
}

interface ReservaCuadre {
  id: string;
  codigoReserva: string;
  estado: string;
  total: string | null;
  fechaServicioInicio: string;
  moneda: { codigo: string; simbolo: string } | null;
}

interface CuadrePublico {
  cliente: { nombre: string };
  reservas: ReservaCuadre[];
  monedaPrincipal: MonedaPrincipal | null;
  porMoneda: TotalPorMoneda[];
  totalGeneral: TotalGeneral | null;
}

export default function CuadreClientePublicoPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<CuadrePublico | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/cuadre-cliente/publico/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: "No se pudo validar el enlace" }));
          throw new Error(body.message ?? "No se pudo validar el enlace");
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo validar el enlace"));
  }, [params.token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm rounded-lg border bg-white p-6 text-center">
          <p className="text-lg font-semibold text-red-600">Enlace inválido</p>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Cargando cuadre...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border bg-white p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Cuadre de cuenta</p>
          <h1 className="mt-1 text-xl font-bold">{data.cliente.nombre}</h1>
        </div>

        {data.monedaPrincipal && data.totalGeneral && (
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-5">
            <h2 className="mb-1 text-sm font-semibold text-emerald-700">
              Total general (convertido a moneda predeterminada)
            </h2>
            <p className="text-2xl font-bold text-emerald-800">
              {data.totalGeneral.monedaSimbolo} {data.totalGeneral.total.toFixed(2)} {data.totalGeneral.monedaCodigo}
            </p>
          </div>
        )}

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Totales por moneda</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-1">Moneda</th>
                <th className="py-1">Cantidad</th>
                <th className="py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.porMoneda.map((m) => (
                <tr key={m.monedaId} className="border-t">
                  <td className="py-1">{m.monedaCodigo}</td>
                  <td className="py-1">{m.cantidad}</td>
                  <td className="py-1 font-semibold">
                    {m.monedaSimbolo} {m.total.toFixed(2)}
                  </td>
                </tr>
              ))}
              {data.porMoneda.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Moneda</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.reservas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No hay reservas para los filtros seleccionados
                  </td>
                </tr>
              )}
              {data.reservas.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{r.codigoReserva}</td>
                  <td className="px-4 py-2">{new Date(r.fechaServicioInicio).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{r.estado}</span>
                  </td>
                  <td className="px-4 py-2">{r.moneda?.codigo}</td>
                  <td className="px-4 py-2">
                    {r.moneda?.simbolo} {r.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
