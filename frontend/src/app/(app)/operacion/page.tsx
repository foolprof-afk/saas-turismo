"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface UsuarioOpcion {
  id: string;
  nombre: string;
}

interface ItemAgenda {
  id: string;
  horaInicio: string;
  estado: string;
  servicio: { nombre: string };
  vehiculo?: { patente: string } | null;
  guia?: { nombre: string } | null;
  puntoRecogida?: { nombre: string } | null;
  dia: {
    itinerario: {
      reserva: {
        codigoReserva: string;
        cliente: { nombre: string };
        vendedor: { nombre: string };
        pasajeros: { nombre: string }[];
      };
    };
  };
}

export default function OperacionPage() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [agenda, setAgenda] = useState<ItemAgenda[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<Set<string>>(new Set());
  const [codigoManual, setCodigoManual] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<UsuarioOpcion[]>("/usuarios")
      .then((lista) => {
        setUsuarios(lista);
        setUsuariosSeleccionados(new Set(lista.map((u) => u.id)));
      })
      .catch(() => null);
  }, []);

  const cargarAgenda = () => {
    const todosSeleccionados = usuarios.length > 0 && usuariosSeleccionados.size === usuarios.length;
    const params = new URLSearchParams({ fecha });
    if (!todosSeleccionados && usuariosSeleccionados.size > 0) {
      params.set("usuarioIds", Array.from(usuariosSeleccionados).join(","));
    }
    api
      .get<ItemAgenda[]>(`/itinerarios?${params.toString()}`)
      .then(setAgenda)
      .catch(() => setAgenda([]));
  };

  useEffect(cargarAgenda, [fecha, usuariosSeleccionados, usuarios]);

  const toggleUsuario = (id: string) => {
    setUsuariosSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => setUsuariosSeleccionados(new Set(usuarios.map((u) => u.id)));
  const deseleccionarTodos = () => setUsuariosSeleccionados(new Set());

  const hacerCheckinManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    try {
      await api.post("/checkin/manual", { codigoReserva: codigoManual });
      setMensaje("Check-in realizado correctamente");
      setCodigoManual("");
      cargarAgenda();
    } catch (err) {
      setMensaje(err instanceof ApiError ? err.message : "Error al hacer check-in");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Operación — Despacho del día</h1>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium">Filtrar por usuario</label>
          <div className="flex gap-3 text-xs text-blue-600">
            <button type="button" onClick={seleccionarTodos} className="hover:underline">
              Seleccionar todos
            </button>
            <button type="button" onClick={deseleccionarTodos} className="hover:underline">
              Quitar todos
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {usuarios.map((u) => (
            <label key={u.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={usuariosSeleccionados.has(u.id)}
                onChange={() => toggleUsuario(u.id)}
              />
              {u.nombre}
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={hacerCheckinManual} className="flex items-end gap-2 rounded-lg border bg-white p-4">
        <div className="flex-1">
          <label className="block text-sm font-medium">Check-in manual por código de reserva</label>
          <input
            required
            value={codigoManual}
            onChange={(e) => setCodigoManual(e.target.value)}
            placeholder="RES-XXXXXXXX"
            className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Check-in
        </button>
      </form>
      {mensaje && <p className="text-sm">{mensaje}</p>}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Hora</th>
              <th className="px-4 py-2">Servicio</th>
              <th className="px-4 py-2">Punto de recogida</th>
              <th className="px-4 py-2">Vehículo</th>
              <th className="px-4 py-2">Guía</th>
              <th className="px-4 py-2">Reserva</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Vendedor</th>
              <th className="px-4 py-2">Pasajeros</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {agenda.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-400">
                  Sin servicios programados para esta fecha
                </td>
              </tr>
            )}
            {agenda.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.horaInicio}</td>
                <td className="px-4 py-2">{item.servicio.nombre}</td>
                <td className="px-4 py-2">{item.puntoRecogida?.nombre ?? "-"}</td>
                <td className="px-4 py-2">{item.vehiculo?.patente ?? "-"}</td>
                <td className="px-4 py-2">{item.guia?.nombre ?? "-"}</td>
                <td className="px-4 py-2 font-mono">{item.dia.itinerario.reserva.codigoReserva}</td>
                <td className="px-4 py-2">{item.dia.itinerario.reserva.cliente.nombre}</td>
                <td className="px-4 py-2">{item.dia.itinerario.reserva.vendedor?.nombre ?? "-"}</td>
                <td className="px-4 py-2">
                  {item.dia.itinerario.reserva.pasajeros.map((p) => p.nombre).join(", ")}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{item.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
