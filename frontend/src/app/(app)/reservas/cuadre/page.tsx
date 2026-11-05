"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatFecha, hoyLocal } from "@/lib/fecha";
import { formatMonto } from "@/lib/moneda";

interface PagoCuadre {
  id: string;
  fecha: string;
  monto: string;
  montoImpuesto: string;
  codigoReserva: string;
  vendedorNombre: string | null;
  formaPago: { nombre: string };
  moneda: { codigo: string; simbolo: string };
}

interface TotalPorMoneda {
  monedaId: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  tasaCambio: number;
  total: number;
  cantidad: number;
}

interface TotalPorMonedaFormaPago extends TotalPorMoneda {
  formaPagoId: string;
  formaPagoNombre: string;
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

interface CuadreResponse {
  pagos: PagoCuadre[];
  monedaPrincipal: MonedaPrincipal | null;
  porMoneda: TotalPorMoneda[];
  porMonedaFormaPago: TotalPorMonedaFormaPago[];
  totalGeneral: TotalGeneral | null;
}

export default function CuadreDeCajaPage() {
  const [data, setData] = useState<CuadreResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [codigoReserva, setCodigoReserva] = useState("");
  const [fechaInicio, setFechaInicio] = useState(hoyLocal);
  const [fechaFin, setFechaFin] = useState(hoyLocal);

  const cargar = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (codigoReserva) params.set("codigoReserva", codigoReserva);
    if (fechaInicio) params.set("fechaInicio", fechaInicio);
    if (fechaFin) params.set("fechaFin", fechaFin);
    const qs = params.toString();
    api
      .get<CuadreResponse>(`/pagos/cuadre${qs ? `?${qs}` : ""}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoReserva, fechaInicio, fechaFin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cuadre de caja</h1>
        <p className="text-sm text-gray-500">
          Ingresos efectivamente percibidos (pagos registrados como pagados). Sin fechas marcadas se suma todo.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div>
          <label className="block text-sm font-medium"># Reserva</label>
          <input
            value={codigoReserva}
            onChange={(e) => setCodigoReserva(e.target.value)}
            placeholder="RES-XXXXXXXX"
            className="mt-1 rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Cargando...</p>}

      {!loading && data && (
        <>
          {data.monedaPrincipal && data.totalGeneral && (
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-5">
              <h2 className="mb-1 text-sm font-semibold text-emerald-700">
                Total general percibido (convertido a moneda predeterminada)
              </h2>
              <p className="text-2xl font-bold text-emerald-800">
                {data.totalGeneral.monedaSimbolo} {formatMonto(data.totalGeneral.total)} {data.totalGeneral.monedaCodigo}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Moneda predeterminada: {data.monedaPrincipal.codigo} — tipo de cambio 1 {data.monedaPrincipal.codigo} ={" "}
                {data.monedaPrincipal.tasaCambio.toFixed(4)} {data.monedaPrincipal.codigo}
              </p>
            </div>
          )}

          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Totales por moneda</h2>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1">Moneda</th>
                  <th className="py-1">Tipo de cambio</th>
                  <th className="py-1">Cantidad de pagos</th>
                  <th className="py-1">Total</th>
                  {data.monedaPrincipal && <th className="py-1">Equivalente</th>}
                </tr>
              </thead>
              <tbody>
                {data.porMoneda.map((m) => {
                  const equivalente =
                    data.monedaPrincipal && m.monedaCodigo !== data.monedaPrincipal.codigo
                      ? (m.total * data.monedaPrincipal.tasaCambio) / m.tasaCambio
                      : null;
                  return (
                    <tr key={m.monedaId} className="border-t">
                      <td className="py-1">{m.monedaCodigo}</td>
                      <td className="py-1 text-gray-500">
                        {m.monedaCodigo === data.monedaPrincipal?.codigo ? "—" : m.tasaCambio.toFixed(4)}
                      </td>
                      <td className="py-1">{m.cantidad}</td>
                      <td className="py-1 font-semibold">
                        {m.monedaSimbolo} {formatMonto(m.total)}
                      </td>
                      {data.monedaPrincipal && (
                        <td className="py-1 text-gray-500">
                          {equivalente !== null
                            ? `≈ ${data.monedaPrincipal.simbolo}${formatMonto(equivalente)} ${data.monedaPrincipal.codigo}`
                            : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {data.porMoneda.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400">
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Totales por moneda y forma de pago</h2>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1">Moneda</th>
                  <th className="py-1">Forma de pago</th>
                  <th className="py-1">Cantidad</th>
                  <th className="py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.porMonedaFormaPago.map((v) => (
                  <tr key={`${v.monedaId}-${v.formaPagoId}`} className="border-t">
                    <td className="py-1">{v.monedaCodigo}</td>
                    <td className="py-1">{v.formaPagoNombre}</td>
                    <td className="py-1">{v.cantidad}</td>
                    <td className="py-1 font-semibold">
                      {v.monedaSimbolo} {formatMonto(v.total)}
                    </td>
                  </tr>
                ))}
                {data.porMonedaFormaPago.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Reserva</th>
                  <th className="px-4 py-2">Vendedor</th>
                  <th className="px-4 py-2">Forma de pago</th>
                  <th className="px-4 py-2">Moneda</th>
                  <th className="px-4 py-2">Monto</th>
                  <th className="px-4 py-2">Impuesto</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.pagos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      No hay pagos para los filtros seleccionados
                    </td>
                  </tr>
                )}
                {data.pagos.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">{formatFecha(p.fecha)}</td>
                    <td className="px-4 py-2 font-mono">{p.codigoReserva}</td>
                    <td className="px-4 py-2">{p.vendedorNombre ?? "—"}</td>
                    <td className="px-4 py-2">{p.formaPago.nombre}</td>
                    <td className="px-4 py-2">{p.moneda.codigo}</td>
                    <td className="px-4 py-2">
                      {p.moneda.simbolo} {formatMonto(Number(p.monto))}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {Number(p.montoImpuesto) > 0 ? `${p.moneda.simbolo} ${formatMonto(Number(p.montoImpuesto))}` : "—"}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {p.moneda.simbolo} {formatMonto(Number(p.monto) + Number(p.montoImpuesto))}
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
