"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { imprimirElemento } from "@/lib/imprimir";

interface OrdenServicioItem {
  id: string;
  cantidad: number;
  precioCosto: string;
  fechaServicio: string;
  servicio: { nombre: string; descripcion?: string | null };
  moneda: { codigo: string; simbolo: string };
}

interface OrdenServicioDetalle {
  id: string;
  codigoOrden: string;
  estado: string;
  fechaEmision: string;
  notas?: string | null;
  proveedor: { nombre: string; contacto?: string | null };
  usuario: { nombre: string };
  agencia?: { nombre: string; razonSocial?: string | null; rutONit?: string | null; logoUrl?: string | null } | null;
  items: OrdenServicioItem[];
}

function totalPorMoneda(orden: OrdenServicioDetalle) {
  const porMoneda = new Map<string, { total: number; simbolo: string }>();
  for (const item of orden.items) {
    const entry = porMoneda.get(item.moneda.codigo) ?? { total: 0, simbolo: item.moneda.simbolo };
    entry.total += Number(item.precioCosto) * item.cantidad;
    porMoneda.set(item.moneda.codigo, entry);
  }
  return Array.from(porMoneda.entries()).map(([codigo, v]) => ({ codigo, ...v }));
}

export default function OrdenServicioDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [orden, setOrden] = useState<OrdenServicioDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = () => {
    api
      .get<OrdenServicioDetalle>(`/ordenes-servicio/${params.id}`)
      .then(setOrden)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la orden"));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleAnular = async () => {
    if (!confirm("¿Anular esta orden de servicio?")) return;
    setProcesando(true);
    try {
      await api.patch(`/ordenes-servicio/${params.id}/anular`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo anular la orden");
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm("¿Eliminar esta orden de servicio de forma permanente?")) return;
    setProcesando(true);
    try {
      await api.delete(`/ordenes-servicio/${params.id}`);
      router.push("/ordenes-servicio");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la orden");
      setProcesando(false);
    }
  };

  if (error && !orden) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!orden) {
    return <p className="text-sm text-gray-400">Cargando...</p>;
  }

  const totales = totalPorMoneda(orden);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Orden {orden.codigoOrden}</h1>
          <p className="text-sm text-gray-500">{orden.proveedor?.nombre}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => imprimirElemento("documento-orden", `Orden ${orden.codigoOrden}`)}
            className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Imprimir / PDF
          </button>
          {orden.estado === "EMITIDA" && (
            <button
              onClick={handleAnular}
              disabled={procesando}
              className="rounded border px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Anular
            </button>
          )}
          <button
            onClick={handleEliminar}
            disabled={procesando}
            className="rounded border px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      <Link href="/ordenes-servicio" className="text-sm text-blue-600 hover:underline print:hidden">
        ← Volver al listado
      </Link>

      {error && <p className="text-sm text-red-600 print:hidden">{error}</p>}

      <div id="documento-orden" className="space-y-6 rounded-lg border bg-white p-8">
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            {orden.agencia?.logoUrl && (
              <img src={orden.agencia.logoUrl} alt="Logo" className="mb-2 h-14 object-contain" />
            )}
            <p className="font-semibold">{orden.agencia?.razonSocial || orden.agencia?.nombre}</p>
            {orden.agencia?.rutONit && <p className="text-xs text-gray-500">RUT/NIT: {orden.agencia.rutONit}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase">Orden de servicio</h2>
            <p className="font-mono text-sm">{orden.codigoOrden}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                orden.estado === "ANULADA" ? "bg-red-100 text-red-700" : "bg-gray-100"
              }`}
            >
              {orden.estado}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Proveedor</p>
            <p className="font-medium">{orden.proveedor?.nombre}</p>
            {orden.proveedor?.contacto && <p className="text-gray-500">{orden.proveedor.contacto}</p>}
          </div>
          <div className="text-right">
            <p>
              <span className="text-gray-500">Fecha de emisión:</span> {new Date(orden.fechaEmision).toLocaleDateString()}
            </p>
            <p className="text-gray-500">Emitida por: {orden.usuario?.nombre}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b text-left text-gray-500">
            <tr>
              <th className="py-2">Servicio</th>
              <th className="py-2">Fecha</th>
              <th className="py-2 text-right">Cantidad</th>
              <th className="py-2 text-right">Precio costo</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {orden.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">
                  {item.servicio.nombre}
                  {item.servicio.descripcion && (
                    <p className="text-xs text-gray-500">{item.servicio.descripcion}</p>
                  )}
                </td>
                <td className="py-2">{new Date(item.fechaServicio).toLocaleDateString()}</td>
                <td className="py-2 text-right">{item.cantidad}</td>
                <td className="py-2 text-right">
                  {item.moneda.simbolo} {Number(item.precioCosto).toFixed(2)}
                </td>
                <td className="py-2 text-right">
                  {item.moneda.simbolo} {(Number(item.precioCosto) * item.cantidad).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="text-right text-sm font-semibold">
            {totales.map((t) => (
              <p key={t.codigo}>
                Total {t.codigo}: {t.simbolo} {t.total.toFixed(2)}
              </p>
            ))}
          </div>
        </div>

        {orden.notas && (
          <div className="border-t pt-4 text-sm">
            <p className="text-gray-500">Notas</p>
            <p className="whitespace-pre-line">{orden.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}
