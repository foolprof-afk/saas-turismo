"use client";

import { useEffect, useState, FormEvent, DragEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

interface LineaServicio {
  servicioId: string;
  dia: number;
  cantidad: string;
  precioUnitario: string;
}

interface CotizacionEditable {
  id: string;
  estado: string;
  cantidadPersonas: number;
  pasajeroResponsable: string;
  documentoResponsable?: string | null;
  telefonoResponsable?: string | null;
  fechaServicio: string;
  notas?: string | null;
  listaPrecioId?: string | null;
  monedaId?: string | null;
  items: { servicioId: string; dia: number; cantidad: number; precioUnitario: string }[];
}

function convertirMonto(monto: number, tasaOrigen: number, tasaDestino: number) {
  return (monto * tasaDestino) / tasaOrigen;
}

export default function EditarCotizacionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

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
  const [lineas, setLineas] = useState<LineaServicio[]>([]);
  const [estado, setEstado] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    api.get<ServicioOpcion[]>("/servicios?limit=500").then(setServicios).catch(() => null);
    api.get<ListaPrecio[]>("/listas-precio/mias").then(setListasPrecio).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
    api
      .get<CotizacionEditable>(`/cotizaciones/${params.id}`)
      .then((c) => {
        setEstado(c.estado);
        setCantidadPersonas(String(c.cantidadPersonas));
        setPasajeroResponsable(c.pasajeroResponsable);
        setDocumentoResponsable(c.documentoResponsable ?? "");
        setTelefonoResponsable(c.telefonoResponsable ?? "");
        setListaPrecioId(c.listaPrecioId ?? "");
        setMonedaId(c.monedaId ?? "");
        setNotas(c.notas ?? "");
        setLineas(
          c.items.map((item) => ({
            servicioId: item.servicioId,
            dia: item.dia,
            cantidad: String(item.cantidad),
            precioUnitario: item.precioUnitario,
          })),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la cotización"))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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
  const recalcularConLista = () => setLineas((s) => s.map((x) => ({ ...x, precioUnitario: "" })));

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

  const cantidadLinea = (l: LineaServicio) => Number(l.cantidad) || Number(cantidadPersonas) || 0;

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
      await api.patch(`/cotizaciones/${params.id}`, {
        cantidadPersonas: Number(cantidadPersonas),
        pasajeroResponsable,
        documentoResponsable: documentoResponsable || undefined,
        telefonoResponsable: telefonoResponsable || undefined,
        listaPrecioId: listaPrecioId || "",
        monedaId: monedaId || "",
        notas: notas || undefined,
        items: items.map((l) => ({
          servicioId: l.servicioId,
          dia: l.dia || 1,
          cantidad: l.cantidad !== "" ? Number(l.cantidad) : undefined,
          precioUnitario: l.precioUnitario !== "" ? Number(l.precioUnitario) : undefined,
        })),
      });
      router.push(`/cotizaciones/${params.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar la cotización");
    } finally {
      setLoading(false);
    }
  };

  if (cargando) return <p className="text-sm text-gray-400">Cargando...</p>;

  if (estado !== "PENDIENTE") {
    return (
      <div className="max-w-2xl space-y-3">
        <p className="text-sm text-red-600">Solo se pueden modificar cotizaciones pendientes.</p>
        <Link href={`/cotizaciones/${params.id}`} className="text-sm text-blue-600 hover:underline">
          Volver a la cotización
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar cotización</h1>
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
            <div className="flex gap-3">
              <button type="button" onClick={recalcularConLista} className="text-sm text-gray-600 hover:underline">
                Recalcular con lista de precio
              </button>
              <button type="button" onClick={agregarServicio} className="text-sm text-blue-600 hover:underline">
                + Agregar servicio
              </button>
            </div>
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href={`/cotizaciones/${params.id}`}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
