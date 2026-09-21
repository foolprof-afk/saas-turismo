"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

interface Opcion {
  id: string;
  nombre: string;
}

interface ServicioOpcion {
  id: string;
  nombre: string;
  proveedorId: string;
  precioCosto?: string | null;
  moneda: { codigo: string; simbolo: string };
}

interface LineaOrden {
  servicioId: string;
  cantidad: string;
  precioCosto: string;
  fechaServicio: string;
}

export default function NuevaOrdenServicioPage() {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<Opcion[]>([]);
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);

  const [proveedorId, setProveedorId] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<LineaOrden[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Opcion[]>("/proveedores").then(setProveedores).catch(() => null);
    api.get<ServicioOpcion[]>("/servicios?limit=500").then(setServicios).catch(() => null);
  }, []);

  const serviciosDelProveedor = servicios.filter((s) => s.proveedorId === proveedorId);

  const cambiarProveedor = (id: string) => {
    setProveedorId(id);
    setItems([]);
  };

  const agregarLinea = () => {
    const primero = serviciosDelProveedor[0];
    if (!primero) return;
    setItems([
      ...items,
      { servicioId: primero.id, cantidad: "1", precioCosto: primero.precioCosto ?? "", fechaServicio: "" },
    ]);
  };

  const actualizarLinea = (index: number, cambios: Partial<LineaOrden>) => {
    setItems(items.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  };

  const cambiarServicioDeLinea = (index: number, servicioId: string) => {
    const servicio = servicios.find((s) => s.id === servicioId);
    actualizarLinea(index, { servicioId, precioCosto: servicio?.precioCosto ?? "" });
  };

  const quitarLinea = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalPorMoneda = () => {
    const porMoneda = new Map<string, { total: number; simbolo: string }>();
    for (const item of items) {
      const servicio = servicios.find((s) => s.id === item.servicioId);
      if (!servicio || item.precioCosto === "") continue;
      const entry = porMoneda.get(servicio.moneda.codigo) ?? { total: 0, simbolo: servicio.moneda.simbolo };
      entry.total += Number(item.precioCosto) * (Number(item.cantidad) || 0);
      porMoneda.set(servicio.moneda.codigo, entry);
    }
    return Array.from(porMoneda.entries()).map(([codigo, v]) => ({ codigo, ...v }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError("Agrega al menos un servicio");
      return;
    }
    setSaving(true);
    try {
      const orden = await api.post<{ id: string }>("/ordenes-servicio", {
        proveedorId,
        notas: notas || undefined,
        items: items.map((l) => ({
          servicioId: l.servicioId,
          cantidad: Number(l.cantidad),
          fechaServicio: l.fechaServicio,
          precioCosto: l.precioCosto !== "" ? Number(l.precioCosto) : undefined,
        })),
      });
      router.push(`/ordenes-servicio/${orden.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la orden de servicio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nueva orden de servicio</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <div>
          <label className="block text-sm font-medium">Proveedor</label>
          <select
            required
            value={proveedorId}
            onChange={(e) => cambiarProveedor(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm sm:w-1/2"
          >
            <option value="">Seleccionar...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Servicios a solicitar</h2>
            <button
              type="button"
              onClick={agregarLinea}
              disabled={!proveedorId || serviciosDelProveedor.length === 0}
              className="rounded border px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              + Agregar servicio
            </button>
          </div>
          {!proveedorId && <p className="text-sm text-gray-400">Selecciona un proveedor para ver sus servicios.</p>}
          {proveedorId && serviciosDelProveedor.length === 0 && (
            <p className="text-sm text-gray-400">Este proveedor no tiene servicios cargados.</p>
          )}

          {items.map((linea, index) => {
            const servicio = servicios.find((s) => s.id === linea.servicioId);
            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded border p-3 sm:grid-cols-[1fr_140px_100px_140px_auto]"
              >
                <select
                  value={linea.servicioId}
                  onChange={(e) => cambiarServicioDeLinea(index, e.target.value)}
                  className="rounded border px-2 py-1.5 text-sm"
                >
                  {serviciosDelProveedor.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  required
                  value={linea.fechaServicio}
                  onChange={(e) => actualizarLinea(index, { fechaServicio: e.target.value })}
                  className="rounded border px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  required
                  value={linea.cantidad}
                  onChange={(e) => actualizarLinea(index, { cantidad: e.target.value })}
                  placeholder="Cant."
                  className="rounded border px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={linea.precioCosto}
                  onChange={(e) => actualizarLinea(index, { precioCosto: e.target.value })}
                  placeholder={`Precio costo ${servicio?.moneda.codigo ?? ""}`}
                  className="rounded border px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => quitarLinea(index)} className="text-sm text-red-600 hover:underline">
                  Quitar
                </button>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="text-right text-sm font-semibold">
            {totalPorMoneda().map((t) => (
              <div key={t.codigo}>
                Total {t.codigo}: {t.simbolo} {t.total.toFixed(2)}
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Observaciones (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Ej. nombres de los pasajeros, indicaciones especiales, etc."
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Creando..." : "Crear orden de servicio"}
        </button>
      </form>
    </div>
  );
}
