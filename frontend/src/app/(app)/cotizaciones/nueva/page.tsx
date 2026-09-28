"use client";

import { useEffect, useState, FormEvent, DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { BuscadorServicio } from "@/components/buscador-servicio";
import { formatMonto } from "@/lib/moneda";

interface ServicioOpcion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioBase: string;
  monedaId: string;
  duracionMin?: number | null;
  palabrasClave?: string[];
}

interface LineaServicio {
  servicioId: string;
  dia: number;
  cantidad: string;
  precioUnitario: string;
}

interface ListaPrecio {
  id: string;
  nombre: string;
  porcentajeAdicional: string;
}

interface Moneda {
  id: string;
  codigo: string;
  simbolo: string;
  tasaCambio: string;
}

// Datos de la cotización de origen al usar "Copiar" desde el listado: se reutilizan personas,
// lista de precio, moneda, notas y servicios, pero se dejan vacíos nombre y teléfono del
// responsable ya que son obligatorios y corresponden a un pasajero distinto.
interface CotizacionParaCopiar {
  cantidadPersonas: number;
  documentoResponsable?: string | null;
  notas?: string | null;
  listaPrecio?: { id: string } | null;
  moneda?: { id: string } | null;
  items: {
    dia: number;
    cantidad: number;
    precioUnitario: string;
    servicio: { id: string };
  }[];
}

function convertirMonto(monto: number, tasaOrigen: number, tasaDestino: number) {
  return (monto * tasaDestino) / tasaOrigen;
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copiarDe = searchParams.get("copiarDe");
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [listasPrecio, setListasPrecio] = useState<ListaPrecio[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [cantidadPersonas, setCantidadPersonas] = useState("1");
  const [pasajeroResponsable, setPasajeroResponsable] = useState("");
  const [documentoResponsable, setDocumentoResponsable] = useState("");
  const [telefonoResponsable, setTelefonoResponsable] = useState("");
  const [listaPrecioId, setListaPrecioId] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaServicio[]>([{ servicioId: "", dia: 1, cantidad: "", precioUnitario: "" }]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    api.get<ServicioOpcion[]>("/servicios?limit=500").then(setServicios).catch(() => null);
    api.get<ListaPrecio[]>("/listas-precio/mias").then(setListasPrecio).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
  }, []);

  useEffect(() => {
    if (listasPrecio.length === 1 && !listaPrecioId) setListaPrecioId(listasPrecio[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listasPrecio]);

  useEffect(() => {
    if (!copiarDe) return;
    setCopiando(true);
    api
      .get<CotizacionParaCopiar>(`/cotizaciones/${copiarDe}`)
      .then((c) => {
        setCantidadPersonas(String(c.cantidadPersonas));
        setDocumentoResponsable(c.documentoResponsable ?? "");
        setListaPrecioId(c.listaPrecio?.id ?? "");
        setMonedaId(c.moneda?.id ?? "");
        setNotas(c.notas ?? "");
        setLineas(
          c.items.map((item) => ({
            servicioId: item.servicio.id,
            dia: item.dia,
            cantidad: String(item.cantidad),
            precioUnitario: item.precioUnitario,
          })),
        );
      })
      .catch(() => setError("No se pudo cargar la cotización a copiar"))
      .finally(() => setCopiando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copiarDe]);

  const factor = 1 + (Number(listasPrecio.find((l) => l.id === listaPrecioId)?.porcentajeAdicional) || 0) / 100;
  const monedaCotizacion = monedas.find((m) => m.id === monedaId);

  const agregarServicio = () =>
    setLineas((s) => [...s, { servicioId: "", dia: s[s.length - 1]?.dia ?? 1, cantidad: "", precioUnitario: "" }]);
  const quitarServicio = (i: number) => setLineas((s) => s.filter((_, idx) => idx !== i));
  const actualizarServicio = (i: number, id: string) =>
    setLineas((s) => s.map((x, idx) => (idx === i ? { ...x, servicioId: id, precioUnitario: "" } : x)));
  const actualizarDia = (i: number, dia: number) =>
    setLineas((s) => s.map((x, idx) => (idx === i ? { ...x, dia } : x)));
  const actualizarCantidad = (i: number, cantidad: string) =>
    setLineas((s) => s.map((x, idx) => (idx === i ? { ...x, cantidad } : x)));
  const actualizarPrecio = (i: number, precioUnitario: string) =>
    setLineas((s) => s.map((x, idx) => (idx === i ? { ...x, precioUnitario } : x)));

  // Reordenar servicios arrastrando (cada línea conserva su propio "dia", así que el
  // agrupamiento por día se mantiene aunque se reordenen visualmente).
  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: DragEvent) => e.preventDefault();
  const handleDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return;
    setLineas((s) => {
      const copia = [...s];
      const [movida] = copia.splice(dragIndex, 1);
      copia.splice(i, 0, movida);
      return copia;
    });
    setDragIndex(null);
  };

  const precioLinea = (l: LineaServicio, s: ServicioOpcion | undefined) => {
    if (!s) return 0;
    return l.precioUnitario !== "" ? Number(l.precioUnitario) : Number(s.precioBase) * factor;
  };

  const cantidadLinea = (l: LineaServicio) => (l.cantidad !== "" ? Number(l.cantidad) : Number(cantidadPersonas) || 0);

  const totalEstimado = lineas.reduce((acc, l) => {
    const s = servicios.find((x) => x.id === l.servicioId);
    if (!s) return acc;
    let precio = precioLinea(l, s);
    if (monedaCotizacion) {
      const monedaServicio = monedas.find((m) => m.id === s.monedaId);
      if (monedaServicio) precio = convertirMonto(precio, Number(monedaServicio.tasaCambio), Number(monedaCotizacion.tasaCambio));
    }
    return acc + precio * cantidadLinea(l);
  }, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const items = lineas.filter((l) => l.servicioId);
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
        listaPrecioId: listaPrecioId || undefined,
        monedaId: monedaId || undefined,
        notas: notas || undefined,
        items: items.map((l) => ({
          servicioId: l.servicioId,
          dia: l.dia || 1,
          cantidad: l.cantidad !== "" ? Number(l.cantidad) : undefined,
          precioUnitario: l.precioUnitario !== "" ? Number(l.precioUnitario) : undefined,
        })),
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
      {copiando && <p className="text-sm text-gray-400">Copiando datos de la cotización...</p>}
      {copiarDe && !copiando && (
        <p className="text-sm text-blue-600">
          Se copiaron los servicios de la cotización original. Completa el nombre y teléfono del nuevo responsable.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Moneda de la cotización</label>
            <select
              value={monedaId}
              onChange={(e) => setMonedaId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Moneda de cada servicio</option>
              {monedas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo}
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
            {lineas.map((linea, i) => {
              const s = servicios.find((x) => x.id === linea.servicioId);
              const horas = s?.duracionMin ? (s.duracionMin / 60).toFixed(1) : null;
              return (
                <div
                  key={i}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                  className={`space-y-1 rounded border p-3 ${dragIndex === i ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="cursor-move select-none px-1 text-gray-300"
                      title="Arrastrar para reordenar"
                    >
                      ⠿
                    </span>
                    <div>
                      <label className="block text-xs text-gray-500">Día</label>
                      <input
                        type="number"
                        min={1}
                        value={linea.dia}
                        onChange={(e) => actualizarDia(i, Number(e.target.value) || 1)}
                        className="mt-1 w-16 rounded border px-2 py-2 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500">Servicio</label>
                      <BuscadorServicio
                        required
                        servicios={servicios}
                        value={linea.servicioId}
                        onChange={(sid) => actualizarServicio(i, sid)}
                      />
                    </div>
                    {s && (
                      <div>
                        <label className="block text-xs text-gray-500">Cantidad</label>
                        <input
                          type="number"
                          min={1}
                          placeholder={cantidadPersonas || "1"}
                          value={linea.cantidad}
                          onChange={(e) => actualizarCantidad(i, e.target.value)}
                          className="mt-1 w-20 rounded border px-2 py-2 text-sm"
                        />
                      </div>
                    )}
                    {s && (
                      <div>
                        <label className="block text-xs text-gray-500">Precio unitario</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder={(Number(s.precioBase) * factor).toFixed(2)}
                          value={linea.precioUnitario}
                          onChange={(e) => actualizarPrecio(i, e.target.value)}
                          className="mt-1 w-28 rounded border px-2 py-2 text-sm"
                        />
                      </div>
                    )}
                    {lineas.length > 1 && (
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
                      {s.descripcion ?? "Sin descripción"} · precio unitario:{" "}
                      {formatMonto(precioLinea(linea, s))} x {cantidadLinea(linea)} personas = total{" "}
                      {formatMonto(precioLinea(linea, s) * cantidadLinea(linea))}
                      {horas ? ` · ${horas} h` : ""}
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

        <p className="text-sm font-medium">
          Total estimado: {monedaCotizacion?.simbolo ?? ""} {formatMonto(totalEstimado)} {monedaCotizacion?.codigo ?? ""}
        </p>

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
