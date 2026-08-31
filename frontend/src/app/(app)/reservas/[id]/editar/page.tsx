"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { BuscadorServicio } from "@/components/buscador-servicio";

interface Moneda {
  id: string;
  codigo: string;
}
interface ServicioOpcion {
  id: string;
  nombre: string;
  precioBase: string;
  monedaId: string;
  palabrasClave?: string[];
}

type Pasajero = { nombre: string; telefono: string; tipo: "ADULTO" | "NINO" | "INFANTE"; esResponsable?: boolean };
type LineaServicio = { servicioId: string; fecha: string; horaInicio: string; precio: string };

interface ReservaEditable {
  id: string;
  codigoReserva: string;
  estado: string;
  tipo: "SERVICIO" | "PLANTILLA" | "MULTIPLE";
  total: string | null;
  monedaId: string | null;
  fechaServicioInicio: string;
  horaServicio?: string | null;
  pasajeros: { nombre: string; telefono?: string | null; tipo: "ADULTO" | "NINO" | "INFANTE"; esResponsable?: boolean }[];
  itinerario?: {
    dias: {
      fecha: string;
      servicios: { horaInicio: string; precio?: string | null; servicio: { id: string; nombre: string; precioBase: string; monedaId: string } }[];
    }[];
  };
}

export default function EditarReservaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [reserva, setReserva] = useState<ReservaEditable | null>(null);
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [fechaServicioInicio, setFechaServicioInicio] = useState("");
  const [horaServicio, setHoraServicio] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [precioLiquidado, setPrecioLiquidado] = useState("");
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [lineas, setLineas] = useState<LineaServicio[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get<ServicioOpcion[]>("/servicios?limit=500").then(setServicios).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
    api
      .get<ReservaEditable>(`/reservas/${params.id}`)
      .then((r) => {
        setReserva(r);
        setFechaServicioInicio(r.fechaServicioInicio.slice(0, 10));
        setHoraServicio(r.horaServicio ?? "");
        setMonedaId(r.monedaId ?? "");
        setPrecioLiquidado(r.total ?? "");
        setPasajeros(
          r.pasajeros.map((p) => ({
            nombre: p.nombre,
            telefono: p.telefono ?? "",
            tipo: p.tipo,
            esResponsable: p.esResponsable,
          })),
        );
        if (r.tipo === "MULTIPLE" && r.itinerario) {
          const nuevasLineas: LineaServicio[] = [];
          r.itinerario.dias.forEach((dia) => {
            dia.servicios.forEach((s) => {
              nuevasLineas.push({
                servicioId: s.servicio.id,
                fecha: dia.fecha.slice(0, 10),
                horaInicio: s.horaInicio,
                precio: s.precio ?? s.servicio.precioBase,
              });
            });
          });
          setLineas(nuevasLineas);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la reserva"))
      .finally(() => setCargando(false));
  }, [params.id]);

  const responsableIndex = Math.max(
    0,
    pasajeros.findIndex((p) => p.esResponsable),
  );

  const agregarPasajero = () => setPasajeros((p) => [...p, { nombre: "", telefono: "", tipo: "ADULTO" }]);
  const quitarPasajero = (i: number) => setPasajeros((p) => p.filter((_, idx) => idx !== i));
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
    if (!reserva) return;
    setError(null);

    if (reserva.tipo === "MULTIPLE") {
      for (const l of lineas) {
        if (!l.servicioId || !l.fecha) {
          setError("Completa servicio y fecha en cada línea del itinerario");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const pasajerosPayload = pasajeros.map((p, i) => ({
        nombre: p.nombre,
        telefono: p.telefono || undefined,
        tipo: p.tipo,
        esResponsable: i === (responsableIndex === -1 ? 0 : responsableIndex),
      }));

      await api.patch(`/reservas/${reserva.id}`, {
        fechaServicioInicio: reserva.tipo !== "MULTIPLE" ? fechaServicioInicio : undefined,
        horaServicio: reserva.tipo !== "MULTIPLE" ? horaServicio || undefined : undefined,
        monedaId: reserva.tipo !== "MULTIPLE" ? monedaId : undefined,
        precioLiquidado: reserva.tipo !== "MULTIPLE" && precioLiquidado ? Number(precioLiquidado) : undefined,
        serviciosMultiples:
          reserva.tipo === "MULTIPLE"
            ? lineas.map((l) => ({
                servicioId: l.servicioId,
                fecha: l.fecha,
                horaInicio: l.horaInicio || undefined,
                precio: l.precio ? Number(l.precio) : undefined,
              }))
            : undefined,
        pasajeros: pasajerosPayload,
      });
      router.push(`/reservas/${reserva.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar la reserva");
    } finally {
      setLoading(false);
    }
  };

  if (cargando) return <p className="text-sm text-gray-400">Cargando...</p>;

  if (reserva && reserva.estado !== "PENDIENTE") {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-red-600">
          Esta reserva ya no se puede modificar (estado: {reserva.estado}). Solo se pueden editar reservas
          pendientes, sin pago registrado.
        </p>
        <Link href={`/reservas/${reserva.id}`} className="text-sm text-blue-600 hover:underline">
          Volver a la reserva
        </Link>
      </div>
    );
  }

  if (!reserva) {
    return <p className="text-sm text-red-600">{error ?? "Reserva no encontrada"}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar reserva {reserva.codigoReserva}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        {reserva.tipo === "MULTIPLE" ? (
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
        ) : (
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
              <label className="block text-sm font-medium">Precio a liquidar</label>
              <input
                type="number"
                step="0.01"
                value={precioLiquidado}
                onChange={(e) => setPrecioLiquidado(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                No puede ser menor al precio establecido por la agencia para el servicio/plantilla original.
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
                  checked={(responsableIndex === -1 ? 0 : responsableIndex) === i}
                  onChange={() => setPasajeros((ps) => ps.map((x, idx) => ({ ...x, esResponsable: idx === i })))}
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href={`/reservas/${reserva.id}`}
            className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
