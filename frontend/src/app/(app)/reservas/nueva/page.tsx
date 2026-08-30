"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { BuscadorServicio } from "@/components/buscador-servicio";

interface Opcion {
  id: string;
  nombre: string;
}
interface Moneda {
  id: string;
  codigo: string;
}
interface ServicioOpcion {
  id: string;
  nombre: string;
  precioBase: string;
  monedaId: string;
}
interface PlantillaDetalle {
  id: string;
  dias: { servicios: { servicio: { precioBase: string; monedaId: string } }[] }[];
}

type Pasajero = { nombre: string; telefono: string; tipo: "ADULTO" | "NINO" | "INFANTE" };
type LineaServicio = { servicioId: string; fecha: string; horaInicio: string; precio: string };
type TipoReserva = "servicio" | "plantilla" | "multiple";

export default function NuevaReservaPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [plantillas, setPlantillas] = useState<Opcion[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [tipoReserva, setTipoReserva] = useState<TipoReserva>("servicio");
  const [servicioId, setServicioId] = useState("");
  const [plantillaItinerarioId, setPlantillaItinerarioId] = useState("");
  const [fechaServicioInicio, setFechaServicioInicio] = useState("");
  const [horaServicio, setHoraServicio] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [precioLiquidado, setPrecioLiquidado] = useState("");
  const [precioUnitarioPlantilla, setPrecioUnitarioPlantilla] = useState<number | null>(null);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([{ nombre: "", telefono: "", tipo: "ADULTO" }]);
  const [responsableIndex, setResponsableIndex] = useState(0);
  const [lineas, setLineas] = useState<LineaServicio[]>([{ servicioId: "", fecha: "", horaInicio: "", precio: "" }]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<ServicioOpcion[]>("/servicios").then(setServicios).catch(() => null);
    api.get<Opcion[]>("/plantillas-itinerario").then(setPlantillas).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
  }, []);

  const servicioSeleccionado = servicios.find((s) => s.id === servicioId);
  const precioMinimo =
    tipoReserva === "servicio"
      ? servicioSeleccionado
        ? Number(servicioSeleccionado.precioBase) * pasajeros.length
        : 0
      : tipoReserva === "plantilla" && precioUnitarioPlantilla !== null
        ? precioUnitarioPlantilla * pasajeros.length
        : 0;

  const seleccionarServicio = (id: string) => {
    setServicioId(id);
    const s = servicios.find((x) => x.id === id);
    if (s) {
      setMonedaId(s.monedaId);
      setPrecioLiquidado(String(Number(s.precioBase) * pasajeros.length));
    }
  };

  const seleccionarPlantilla = async (id: string) => {
    setPlantillaItinerarioId(id);
    if (!id) {
      setPrecioUnitarioPlantilla(null);
      return;
    }
    try {
      const detalle = await api.get<PlantillaDetalle>(`/plantillas-itinerario/${id}`);
      const totalUnitario = detalle.dias.reduce(
        (acc, dia) => acc + dia.servicios.reduce((s, item) => s + Number(item.servicio.precioBase), 0),
        0,
      );
      setPrecioUnitarioPlantilla(totalUnitario);
      const primerServicio = detalle.dias[0]?.servicios[0]?.servicio;
      if (primerServicio) setMonedaId(primerServicio.monedaId);
      setPrecioLiquidado(String(totalUnitario * pasajeros.length));
    } catch {
      setPrecioUnitarioPlantilla(null);
    }
  };

  const agregarPasajero = () => {
    setPasajeros((p) => {
      const nuevos = [...p, { nombre: "", telefono: "", tipo: "ADULTO" as const }];
      if (tipoReserva === "servicio" && servicioSeleccionado) {
        const nuevoMinimo = Number(servicioSeleccionado.precioBase) * nuevos.length;
        setPrecioLiquidado((prev) => String(Math.max(Number(prev) || 0, nuevoMinimo)));
      } else if (tipoReserva === "plantilla" && precioUnitarioPlantilla !== null) {
        const nuevoMinimo = precioUnitarioPlantilla * nuevos.length;
        setPrecioLiquidado((prev) => String(Math.max(Number(prev) || 0, nuevoMinimo)));
      }
      return nuevos;
    });
  };
  const quitarPasajero = (i: number) => {
    setPasajeros((p) => p.filter((_, idx) => idx !== i));
    setResponsableIndex((r) => (r === i ? 0 : r > i ? r - 1 : r));
  };
  const actualizarPasajero = (i: number, data: Partial<Pasajero>) =>
    setPasajeros((p) => p.map((x, idx) => (idx === i ? { ...x, ...data } : x)));

  const agregarLinea = () =>
    setLineas((l) => [...l, { servicioId: "", fecha: "", horaInicio: "", precio: "" }]);
  const quitarLinea = (i: number) => setLineas((l) => l.filter((_, idx) => idx !== i));
  const actualizarLinea = (i: number, data: Partial<LineaServicio>) =>
    setLineas((l) => l.map((x, idx) => (idx === i ? { ...x, ...data } : x)));
  const seleccionarServicioLinea = (i: number, id: string) => {
    const s = servicios.find((x) => x.id === id);
    actualizarLinea(i, { servicioId: id, precio: s ? s.precioBase : "" });
  };
  const monedaCodigo = (id?: string) => monedas.find((m) => m.id === id)?.codigo ?? "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tipoReserva !== "multiple" && precioLiquidado && Number(precioLiquidado) < precioMinimo) {
      setError(`El precio no puede ser menor al precio establecido (${precioMinimo})`);
      return;
    }

    if (tipoReserva === "multiple") {
      for (const l of lineas) {
        if (!l.servicioId || !l.fecha) {
          setError("Completa servicio y fecha en cada línea del itinerario");
          return;
        }
        const s = servicios.find((x) => x.id === l.servicioId);
        if (s && l.precio && Number(l.precio) < Number(s.precioBase)) {
          setError(`El precio de "${s.nombre}" no puede ser menor a ${s.precioBase}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const pasajerosPayload = pasajeros.map((p, i) => ({
        ...p,
        telefono: p.telefono || undefined,
        esResponsable: i === responsableIndex,
      }));

      const reserva = await api.post<{ id: string }>("/reservas", {
        servicioId: tipoReserva === "servicio" ? servicioId : undefined,
        plantillaItinerarioId: tipoReserva === "plantilla" ? plantillaItinerarioId : undefined,
        serviciosMultiples:
          tipoReserva === "multiple"
            ? lineas.map((l) => ({
                servicioId: l.servicioId,
                fecha: l.fecha,
                horaInicio: l.horaInicio || undefined,
                precio: l.precio ? Number(l.precio) : undefined,
              }))
            : undefined,
        fechaServicioInicio: tipoReserva !== "multiple" ? fechaServicioInicio : undefined,
        horaServicio: tipoReserva !== "multiple" ? horaServicio || undefined : undefined,
        monedaId: tipoReserva !== "multiple" ? monedaId : undefined,
        precioLiquidado: tipoReserva !== "multiple" && precioLiquidado ? Number(precioLiquidado) : undefined,
        pasajeros: pasajerosPayload,
      });
      router.push(`/reservas/${reserva.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la reserva");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nueva reserva</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <div>
          <label className="block text-sm font-medium">Cliente</label>
          <p className="mt-1 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">{usuario?.nombre}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Tipo de reserva</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setTipoReserva("servicio")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                tipoReserva === "servicio" ? "border-gray-900 bg-gray-900 text-white" : "text-gray-700"
              }`}
            >
              Servicio individual
            </button>
            <button
              type="button"
              onClick={() => setTipoReserva("plantilla")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                tipoReserva === "plantilla" ? "border-gray-900 bg-gray-900 text-white" : "text-gray-700"
              }`}
            >
              Plantilla (paquete)
            </button>
            <button
              type="button"
              onClick={() => setTipoReserva("multiple")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                tipoReserva === "multiple" ? "border-gray-900 bg-gray-900 text-white" : "text-gray-700"
              }`}
            >
              Servicios múltiples
            </button>
          </div>
          {tipoReserva === "multiple" && (
            <p className="mt-1 text-xs text-gray-400">
              Usa este modo cuando el grupo tiene varios servicios en fechas u horas distintas (ej. traslado el
              día 1, tour el día 2). Cada servicio conserva su propia moneda.
            </p>
          )}
        </div>

        {tipoReserva === "servicio" && (
          <div>
            <label className="block text-sm font-medium">Servicio</label>
            <div className="mt-1">
              <BuscadorServicio required servicios={servicios} value={servicioId} onChange={seleccionarServicio} />
            </div>
          </div>
        )}

        {tipoReserva === "plantilla" && (
          <div>
            <label className="block text-sm font-medium">Plantilla de itinerario</label>
            <select
              required
              value={plantillaItinerarioId}
              onChange={(e) => seleccionarPlantilla(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar plantilla...</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Si un tour o traslado tiene varios horarios, crea un servicio distinto por cada hora dentro de la
              plantilla para que quede claro qué incluye cada uno.
            </p>
          </div>
        )}

        {tipoReserva === "multiple" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium">Servicios del itinerario</label>
              <button type="button" onClick={agregarLinea} className="text-sm text-blue-600 hover:underline">
                + Agregar servicio
              </button>
            </div>
            <div className="space-y-3">
              {lineas.map((l, i) => {
                const s = servicios.find((x) => x.id === l.servicioId);
                return (
                  <div key={i} className="space-y-2 rounded border p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <BuscadorServicio
                          required
                          servicios={servicios}
                          value={l.servicioId}
                          onChange={(id) => seleccionarServicioLinea(i, id)}
                        />
                      </div>
                      {lineas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => quitarLinea(i)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="date"
                        required
                        value={l.fecha}
                        onChange={(e) => actualizarLinea(i, { fecha: e.target.value })}
                        className="rounded border px-3 py-2 text-sm"
                      />
                      <input
                        type="time"
                        value={l.horaInicio}
                        onChange={(e) => actualizarLinea(i, { horaInicio: e.target.value })}
                        className="rounded border px-3 py-2 text-sm"
                        placeholder="Hora"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min={s ? Number(s.precioBase) : undefined}
                          value={l.precio}
                          onChange={(e) => actualizarLinea(i, { precio: e.target.value })}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                        {s && <span className="text-xs text-gray-400">{monedaCodigo(s.monedaId)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tipoReserva !== "multiple" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  required
                  value={fechaServicioInicio}
                  onChange={(e) => setFechaServicioInicio(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Hora del servicio (opcional)</label>
                <input
                  type="time"
                  value={horaServicio}
                  onChange={(e) => setHoraServicio(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Moneda</label>
              <select
                required
                value={monedaId}
                onChange={(e) => setMonedaId(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                {monedas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.codigo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Precio a liquidar
                {(tipoReserva === "servicio" && servicioSeleccionado) ||
                (tipoReserva === "plantilla" && precioUnitarioPlantilla !== null)
                  ? ` (mínimo: ${precioMinimo})`
                  : ""}
              </label>
              <input
                type="number"
                step="0.01"
                min={precioMinimo}
                value={precioLiquidado}
                onChange={(e) => setPrecioLiquidado(e.target.value)}
                placeholder="Se calcula automáticamente según el servicio o la plantilla"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                Puedes subir el precio para ganar más, pero nunca bajarlo del precio establecido por la agencia.
              </p>
            </div>
          </>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">Pasajeros</label>
            <button type="button" onClick={agregarPasajero} className="text-sm text-blue-600 hover:underline">
              + Agregar pasajero
            </button>
          </div>
          <p className="mb-2 text-xs text-gray-400">Marca quién es el responsable/contacto del grupo.</p>
          <div className="space-y-2">
            {pasajeros.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="responsable"
                  checked={responsableIndex === i}
                  onChange={() => setResponsableIndex(i)}
                  title="Responsable del grupo"
                />
                <input
                  required
                  placeholder="Nombre completo"
                  value={p.nombre}
                  onChange={(e) => actualizarPasajero(i, { nombre: e.target.value })}
                  className="flex-1 rounded border px-3 py-2 text-sm"
                />
                <input
                  placeholder="Teléfono"
                  value={p.telefono}
                  onChange={(e) => actualizarPasajero(i, { telefono: e.target.value })}
                  className="w-36 rounded border px-3 py-2 text-sm"
                />
                <select
                  value={p.tipo}
                  onChange={(e) => actualizarPasajero(i, { tipo: e.target.value as Pasajero["tipo"] })}
                  className="rounded border px-3 py-2 text-sm"
                >
                  <option value="ADULTO">Adulto</option>
                  <option value="NINO">Niño</option>
                  <option value="INFANTE">Infante</option>
                </select>
                {pasajeros.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarPasajero(i)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400">
          La forma de pago se elige al confirmar la reserva, en la siguiente pantalla.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear reserva"}
        </button>
      </form>
    </div>
  );
}
