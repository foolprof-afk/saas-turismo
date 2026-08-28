"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

interface Opcion {
  id: string;
  nombre: string;
}
interface Moneda {
  id: string;
  codigo: string;
}

type Pasajero = { nombre: string; tipo: "ADULTO" | "NINO" | "INFANTE" };

export default function NuevaReservaPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Opcion[]>([]);
  const [plantillas, setPlantillas] = useState<Opcion[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [formasPago, setFormasPago] = useState<Opcion[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [plantillaItinerarioId, setPlantillaItinerarioId] = useState("");
  const [fechaServicioInicio, setFechaServicioInicio] = useState("");
  const [fechaServicioFin, setFechaServicioFin] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [formaPagoId, setFormaPagoId] = useState("");
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([{ nombre: "", tipo: "ADULTO" }]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Opcion[]>("/clientes").then(setClientes).catch(() => null);
    api.get<Opcion[]>("/plantillas-itinerario").then(setPlantillas).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
    api.get<Opcion[]>("/formas-pago").then(setFormasPago).catch(() => null);
  }, []);

  const agregarPasajero = () => setPasajeros((p) => [...p, { nombre: "", tipo: "ADULTO" }]);
  const actualizarPasajero = (i: number, data: Partial<Pasajero>) =>
    setPasajeros((p) => p.map((x, idx) => (idx === i ? { ...x, ...data } : x)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const reserva = await api.post<{ id: string }>("/reservas", {
        clienteId,
        plantillaItinerarioId: plantillaItinerarioId || undefined,
        fechaServicioInicio,
        fechaServicioFin,
        monedaId,
        formaPagoId,
        pasajeros,
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
          <select
            required
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Plantilla de itinerario (opcional)</label>
          <select
            value={plantillaItinerarioId}
            onChange={(e) => setPlantillaItinerarioId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Sin plantilla</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Fecha inicio</label>
            <input
              type="date"
              required
              value={fechaServicioInicio}
              onChange={(e) => setFechaServicioInicio(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Fecha fin</label>
            <input
              type="date"
              required
              value={fechaServicioFin}
              onChange={(e) => setFechaServicioFin(e.target.value)}
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
