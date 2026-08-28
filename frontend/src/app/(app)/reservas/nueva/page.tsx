"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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

type Pasajero = { nombre: string; telefono: string; tipo: "ADULTO" | "NINO" | "INFANTE" };
type TipoReserva = "servicio" | "plantilla";

export default function NuevaReservaPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [plantillas, setPlantillas] = useState<Opcion[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [formasPago, setFormasPago] = useState<Opcion[]>([]);

  const [tipoReserva, setTipoReserva] = useState<TipoReserva>("servicio");
  const [servicioId, setServicioId] = useState("");
  const [plantillaItinerarioId, setPlantillaItinerarioId] = useState("");
  const [fechaServicioInicio, setFechaServicioInicio] = useState("");
  const [horaServicio, setHoraServicio] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [formaPagoId, setFormaPagoId] = useState("");
  const [precioLiquidado, setPrecioLiquidado] = useState("");
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([{ nombre: "", telefono: "", tipo: "ADULTO" }]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<ServicioOpcion[]>("/servicios").then(setServicios).catch(() => null);
    api.get<Opcion[]>("/plantillas-itinerario").then(setPlantillas).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
    api.get<Opcion[]>("/formas-pago").then(setFormasPago).catch(() => null);
  }, []);

  const servicioSeleccionado = servicios.find((s) => s.id === servicioId);
  const precioMinimo = servicioSeleccionado ? Number(servicioSeleccionado.precioBase) * pasajeros.length : 0;

  const seleccionarServicio = (id: string) => {
    setServicioId(id);
    const s = servicios.find((x) => x.id === id);
    if (s) {
      setMonedaId(s.monedaId);
      setPrecioLiquidado(String(Number(s.precioBase) * pasajeros.length));
    }
  };

  const agregarPasajero = () =>
    setPasajeros((p) => {
      const nuevos = [...p, { nombre: "", telefono: "", tipo: "ADULTO" as const }];
      if (servicioSeleccionado) {
        const nuevoMinimo = Number(servicioSeleccionado.precioBase) * nuevos.length;
        setPrecioLiquidado((prev) => String(Math.max(Number(prev) || 0, nuevoMinimo)));
      }
      return nuevos;
    });
  const actualizarPasajero = (i: number, data: Partial<Pasajero>) =>
    setPasajeros((p) => p.map((x, idx) => (idx === i ? { ...x, ...data } : x)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tipoReserva === "servicio" && precioLiquidado && Number(precioLiquidado) < precioMinimo) {
      setError(`El precio no puede ser menor al precio establecido (${precioMinimo})`);
      return;
    }

    setLoading(true);
    try {
      const reserva = await api.post<{ id: string }>("/reservas", {
        servicioId: tipoReserva === "servicio" ? servicioId : undefined,
        plantillaItinerarioId: tipoReserva === "plantilla" ? plantillaItinerarioId : undefined,
        fechaServicioInicio,
        horaServicio: horaServicio || undefined,
        monedaId,
        formaPagoId,
        precioLiquidado: precioLiquidado ? Number(precioLiquidado) : undefined,
        pasajeros: pasajeros.map((p) => ({ ...p, telefono: p.telefono || undefined })),
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
          </div>
        </div>

        {tipoReserva === "servicio" ? (
          <div>
            <label className="block text-sm font-medium">Servicio</label>
            <select
              required
              value={servicioId}
              onChange={(e) => seleccionarServicio(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar servicio...</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {s.precioBase}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium">Plantilla de itinerario</label>
            <select
              required
              value={plantillaItinerarioId}
              onChange={(e) => setPlantillaItinerarioId(e.target.value)}
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

        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium">Forma de pago</label>
            <select
              required
              value={formaPagoId}
              onChange={(e) => setFormaPagoId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {formasPago.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Precio a liquidar{tipoReserva === "servicio" && servicioSeleccionado ? ` (mínimo: ${precioMinimo})` : ""}
          </label>
          <input
            type="number"
            step="0.01"
            min={tipoReserva === "servicio" ? precioMinimo : 0}
            value={precioLiquidado}
            onChange={(e) => setPrecioLiquidado(e.target.value)}
            placeholder="Se calcula automáticamente según el servicio o la plantilla"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">
            Puedes subir el precio para ganar más, pero nunca bajarlo del precio establecido por la agencia.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">Pasajeros</label>
            <button type="button" onClick={agregarPasajero} className="text-sm text-blue-600 hover:underline">
              + Agregar pasajero
            </button>
          </div>
          <div className="space-y-2">
            {pasajeros.map((p, i) => (
              <div key={i} className="flex gap-2">
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
              </div>
            ))}
          </div>
        </div>

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
