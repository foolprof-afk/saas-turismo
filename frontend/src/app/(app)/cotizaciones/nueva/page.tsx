"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { BuscadorServicio } from "@/components/buscador-servicio";

interface ServicioOpcion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioBase: string;
  monedaId: string;
  palabrasClave?: string[];
}

interface ListaPrecio {
  id: string;
  nombre: string;
  porcentajeAdicional: string;
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [listasPrecio, setListasPrecio] = useState<ListaPrecio[]>([]);

  const [cantidadPersonas, setCantidadPersonas] = useState("1");
  const [pasajeroResponsable, setPasajeroResponsable] = useState("");
  const [documentoResponsable, setDocumentoResponsable] = useState("");
  const [telefonoResponsable, setTelefonoResponsable] = useState("");
  const [fechaServicio, setFechaServicio] = useState("");
  const [listaPrecioId, setListaPrecioId] = useState("");
  const [notas, setNotas] = useState("");
  const [serviciosIds, setServiciosIds] = useState<string[]>([""]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<ServicioOpcion[]>("/servicios?limit=500").then(setServicios).catch(() => null);
    api.get<ListaPrecio[]>("/listas-precio/mias").then(setListasPrecio).catch(() => null);
  }, []);

  useEffect(() => {
    if (listasPrecio.length === 1) setListaPrecioId(listasPrecio[0].id);
  }, [listasPrecio]);

  const factor = 1 + (Number(listasPrecio.find((l) => l.id === listaPrecioId)?.porcentajeAdicional) || 0) / 100;

  const agregarServicio = () => setServiciosIds((s) => [...s, ""]);
  const quitarServicio = (i: number) => setServiciosIds((s) => s.filter((_, idx) => idx !== i));
  const actualizarServicio = (i: number, id: string) =>
    setServiciosIds((s) => s.map((x, idx) => (idx === i ? id : x)));

  const totalEstimado = serviciosIds.reduce((acc, id) => {
    const s = servicios.find((x) => x.id === id);
    if (!s) return acc;
    return acc + Number(s.precioBase) * factor * (Number(cantidadPersonas) || 0);
  }, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const items = serviciosIds.filter(Boolean);
    if (items.length === 0) {
      setError("Agrega al menos un servicio a la cotización");
      return;
    }

    setLoading(true);
    try {
      const cotizacion = await api.post<{ id: string }>("/cotizaciones", {
        cantidadPersonas: Number(cantidadPersonas),
        pasajeroResponsable,
        documentoResponsable: documentoResponsable || undefined,
        telefonoResponsable: telefonoResponsable || undefined,
        fechaServicio,
        listaPrecioId: listaPrecioId || undefined,
        notas: notas || undefined,
        items: items.map((servicioId) => ({ servicioId })),
      });
      router.push(`/cotizaciones/${cotizacion.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cotización");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nueva cotización</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Pasajero responsable</label>
            <input
              required
              value={pasajeroResponsable}
              onChange={(e) => setPasajeroResponsable(e.target.value)}
              placeholder="Nombre completo"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Cantidad de personas</label>
            <input
              type="number"
              min={1}
              required
              value={cantidadPersonas}
              onChange={(e) => setCantidadPersonas(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Documento (opcional)</label>
            <input
              value={documentoResponsable}
              onChange={(e) => setDocumentoResponsable(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Teléfono (opcional)</label>
            <input
              value={telefonoResponsable}
              onChange={(e) => setTelefonoResponsable(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Fecha del servicio</label>
            <input
              type="date"
              required
              value={fechaServicio}
              onChange={(e) => setFechaServicio(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Lista de precio</label>
            <select
              value={listaPrecioId}
              onChange={(e) => setListaPrecioId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Precio base (sin lista)</option>
              {listasPrecio.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} (+{l.porcentajeAdicional}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">Servicios</label>
            <button type="button" onClick={agregarServicio} className="text-sm text-blue-600 hover:underline">
              + Agregar servicio
            </button>
          </div>
          <div className="space-y-3">
            {serviciosIds.map((id, i) => {
              const s = servicios.find((x) => x.id === id);
              return (
                <div key={i} className="space-y-1 rounded border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <BuscadorServicio
                        required
                        servicios={servicios}
                        value={id}
                        onChange={(sid) => actualizarServicio(i, sid)}
                      />
                    </div>
                    {serviciosIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarServicio(i)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {s && (
                    <p className="text-xs text-gray-400">
                      {s.descripcion ?? "Sin descripción"} · precio con lista:{" "}
                      {(Number(s.precioBase) * factor).toFixed(2)} x {cantidadPersonas || 0} personas
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <p className="text-sm font-medium">Total estimado: {totalEstimado.toFixed(2)}</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear cotización"}
        </button>
      </form>
    </div>
  );
}
