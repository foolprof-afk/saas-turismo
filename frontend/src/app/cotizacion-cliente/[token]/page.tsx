"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatFecha } from "@/lib/fecha";
import { formatMonto } from "@/lib/moneda";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface CotizacionItem {
  id: string;
  dia: number;
  cantidad: number;
  precioUnitario: string;
  servicio: { nombre: string; descripcion?: string | null; duracionMin?: number | null };
  moneda: { codigo: string; simbolo: string; tasaCambio: string };
}

interface CotizacionPublica {
  codigoCotizacion: string;
  estado: string;
  cantidadPersonas: number;
  pasajeroResponsable: string;
  fechaServicio: string;
  notas?: string | null;
  vendedor: { nombre: string };
  moneda?: { codigo: string; simbolo: string; tasaCambio: string } | null;
  agencia?: { logoUrl?: string | null; nombre?: string } | null;
  items: CotizacionItem[];
}

function convertirMonto(monto: number, tasaOrigen: number, tasaDestino: number) {
  return (monto * tasaDestino) / tasaOrigen;
}

function itemEnMonedaCotizacion(item: CotizacionItem, cotizacion: CotizacionPublica) {
  const precioOriginal = Number(item.precioUnitario);
  if (!cotizacion.moneda) {
    return {
      precioUnitario: precioOriginal,
      subtotal: precioOriginal * item.cantidad,
      simbolo: item.moneda.simbolo,
      codigo: item.moneda.codigo,
    };
  }
  const precioUnitario = convertirMonto(precioOriginal, Number(item.moneda.tasaCambio), Number(cotizacion.moneda.tasaCambio));
  return {
    precioUnitario,
    subtotal: precioUnitario * item.cantidad,
    simbolo: cotizacion.moneda.simbolo,
    codigo: cotizacion.moneda.codigo,
  };
}

function totalConvertido(cotizacion: CotizacionPublica): { total: number; simbolo: string; codigo: string } | null {
  if (!cotizacion.moneda) return null;
  const tasaDestino = Number(cotizacion.moneda.tasaCambio);
  const total = cotizacion.items.reduce((acc, item) => {
    const monto = Number(item.precioUnitario) * item.cantidad;
    return acc + convertirMonto(monto, Number(item.moneda.tasaCambio), tasaDestino);
  }, 0);
  return { total, simbolo: cotizacion.moneda.simbolo, codigo: cotizacion.moneda.codigo };
}

function totalesPorMoneda(cotizacion: CotizacionPublica) {
  const porMoneda = new Map<string, { total: number; codigo: string; simbolo: string }>();
  for (const item of cotizacion.items) {
    const entry = porMoneda.get(item.moneda.codigo) ?? { total: 0, codigo: item.moneda.codigo, simbolo: item.moneda.simbolo };
    entry.total += Number(item.precioUnitario) * item.cantidad;
    porMoneda.set(item.moneda.codigo, entry);
  }
  return Array.from(porMoneda.values());
}

function agruparPorDia(cotizacion: CotizacionPublica) {
  const dias = new Map<number, CotizacionItem[]>();
  for (const item of cotizacion.items) {
    const dia = item.dia || 1;
    if (!dias.has(dia)) dias.set(dia, []);
    dias.get(dia)!.push(item);
  }
  return Array.from(dias.entries()).sort((a, b) => a[0] - b[0]);
}

function horasDe(item: CotizacionItem): string | null {
  return item.servicio.duracionMin ? (item.servicio.duracionMin / 60).toFixed(1) : null;
}

export default function CotizacionClientePublicaPage() {
  const params = useParams<{ token: string }>();
  const [cotizacion, setCotizacion] = useState<CotizacionPublica | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/cotizacion-cliente/publico/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: "No se pudo validar el enlace" }));
          throw new Error(body.message ?? "No se pudo validar el enlace");
        }
        return res.json();
      })
      .then(setCotizacion)
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

  if (!cotizacion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Cargando cotización...</p>
      </div>
    );
  }

  const totales = totalesPorMoneda(cotizacion);
  const totalUnificado = totalConvertido(cotizacion);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border bg-white p-5 text-center">
          {cotizacion.agencia?.logoUrl && (
            <img
              src={cotizacion.agencia.logoUrl}
              alt={cotizacion.agencia.nombre ?? "Logo"}
              className="mx-auto mb-2 h-16 w-16 object-contain"
            />
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {cotizacion.agencia?.nombre ?? "Cotización"}
          </p>
          <h1 className="mt-1 text-xl font-bold">Cotización {cotizacion.codigoCotizacion}</h1>
          <span className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs">{cotizacion.estado}</span>
        </div>

        {totalUnificado ? (
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5 text-center">
            <h2 className="mb-1 text-sm font-semibold text-blue-700">Total</h2>
            <p className="text-2xl font-bold text-blue-800">
              {totalUnificado.simbolo} {formatMonto(totalUnificado.total)} {totalUnificado.codigo}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5 text-center">
            {totales.map((t) => (
              <p key={t.codigo} className="text-xl font-bold text-blue-800">
                {t.simbolo} {formatMonto(t.total)} {t.codigo}
              </p>
            ))}
          </div>
        )}

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Datos del responsable</h2>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-gray-400">Nombre:</span> {cotizacion.pasajeroResponsable}
            </p>
            <p>
              <span className="text-gray-400">Personas:</span> {cotizacion.cantidadPersonas}
            </p>
            <p>
              <span className="text-gray-400">Fecha:</span> {formatFecha(cotizacion.fechaServicio)}
            </p>
            <p>
              <span className="text-gray-400">Vendedor:</span> {cotizacion.vendedor?.nombre}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Día</th>
                <th className="px-3 py-2">Servicio</th>
                <th className="px-3 py-2">Cant.</th>
                <th className="px-3 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {agruparPorDia(cotizacion).map(([dia, itemsDia]) =>
                itemsDia.map((item, idx) => {
                  const conv = itemEnMonedaCotizacion(item, cotizacion);
                  const horas = horasDe(item);
                  return (
                    <tr key={item.id} className="border-t align-top">
                      <td className="px-3 py-2">{idx === 0 ? `Día ${dia}` : ""}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{item.servicio.nombre}</p>
                        {item.servicio.descripcion && (
                          <p className="text-xs text-gray-400">{item.servicio.descripcion}</p>
                        )}
                        {horas && <p className="text-xs text-gray-400">{horas} h</p>}
                      </td>
                      <td className="px-3 py-2">{item.cantidad}</td>
                      <td className="px-3 py-2">
                        {conv.simbolo}
                        {formatMonto(conv.subtotal)} {conv.codigo}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>

        {cotizacion.notas && (
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Notas</h2>
            <p className="text-sm text-gray-700">{cotizacion.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}
