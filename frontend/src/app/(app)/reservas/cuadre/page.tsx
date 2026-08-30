"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Vendedor {
  id: string;
  nombre: string;
}

interface ReservaCuadre {
  id: string;
  codigoReserva: string;
  estado: string;
  total: string;
  fechaServicioInicio: string;
  cliente: { nombre: string };
  vendedor: { nombre: string };
  formaPago?: { nombre: string } | null;
  moneda: { codigo: string; simbolo: string };
}

interface TotalPorMoneda {
  monedaId: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  total: number;
  cantidad: number;
}

interface TotalPorVendedor extends TotalPorMoneda {
  vendedorId: string;
  vendedorNombre: string;
}

interface CuadreResponse {
  reservas: ReservaCuadre[];
  porMoneda: TotalPorMoneda[];
  porVendedor: TotalPorVendedor[];
}

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "OPERADA", "CANCELADA"];

export default function CuadreDeCajaPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [data, setData] = useState<CuadreResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [codigoReserva, setCodigoReserva] = useState("");
  const [estado, setEstado] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    api.get<Vendedor[]>("/usuarios/vendedores").then(setVendedores).catch(() => setVendedores([]));
  }, []);

  const cargar = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (codigoReserva) params.set("codigoReserva", codigoReserva);
    if (estado) params.set("estado", estado);
    if (vendedorId) params.set("vendedorId", vendedorId);
    if (fechaInicio) params.set("fechaInicio", fechaInicio);
    if (fechaFin) params.set("fechaFin", fechaFin);
    const qs = params.toString();
    api
      .get<CuadreResponse>(`/reservas/cuadre${qs ? `?${qs}` : ""}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
  }, [codigoReserva, estado, vendedorId, fechaInicio, fechaFin]);

  const filtrandoPorCodigo = codigoReserva.trim().length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cuadre de caja</h1>

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
            disabled={filtrandoPorCodigo}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm disabled:opacity-50"
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
            disabled={filtrandoPorCodigo}
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm disabled:opacity-50"
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
          <label className="block text-sm font-medium">Desde</label>
          <input
            type="date"
            disabled={filtrandoPorCodigo}
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input
            type="date"
            disabled={filtrandoPorCodigo}
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
      </div>

      {filtrandoPorCodigo && (
        <p className="text-xs text-gray-500">
          Filtrando solo por código de reserva — se ignoran fecha, estado y vendedor.
        </p>
      )}

      {loading && <p className="text-sm text-gray-400">Cargando...</p>}

      {!loading && data && (
        <>
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">
              Totales por moneda (dinero real en caja por tipo de moneda)
            </h2>
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

          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Totales por vendedor y moneda</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1">Vendedor</th>
                  <th className="py-1">Moneda</th>
                  <th className="py-1">Cantidad</th>
                  <th className="py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.porVendedor.map((v) => (
                  <tr key={`${v.vendedorId}-${v.monedaId}`} className="border-t">
                    <td className="py-1">{v.vendedorNombre}</td>
                    <td className="py-1">{v.monedaCodigo}</td>
                    <td className="py-1">{v.cantidad}</td>
                    <td className="py-1">
                      {v.monedaSimbolo} {v.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {data.porVendedor.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">
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
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Vendedor</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Forma de pago</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Moneda</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.reservas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      No hay reservas para los filtros seleccionados
                    </td>
                  </tr>
                )}
                {data.reservas.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono">{r.codigoReserva}</td>
                    <td className="px-4 py-2">{r.cliente?.nombre}</td>
                    <td className="px-4 py-2">{r.vendedor?.nombre}</td>
                    <td className="px-4 py-2">{new Date(r.fechaServicioInicio).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{r.formaPago?.nombre ?? "—"}</td>
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
        </>
      )}
    </div>
  );
}
