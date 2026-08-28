"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface ItemAgenda {
  id: string;
  horaInicio: string;
  estado: string;
  servicio: { nombre: string };
  dia: { itinerario: { reserva: { codigoReserva: string; cliente: { nombre: string } } } };
}

export default function OperacionPage() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [agenda, setAgenda] = useState<ItemAgenda[]>([]);
  const [codigoManual, setCodigoManual] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarAgenda = () => {
    api.get<ItemAgenda[]>(`/itinerarios?fecha=${fecha}`).then(setAgenda).catch(() => setAgenda([]));
  };

  useEffect(cargarAgenda, [fecha]);

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
        <h1 className="text-2xl font-semibold">Operación — Agenda del día</h1>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
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

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Hora</th>
              <th className="px-4 py-2">Servicio</th>
              <th className="px-4 py-2">Reserva</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {agenda.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Sin servicios programados para esta fecha
                </td>
              </tr>
            )}
            {agenda.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.horaInicio}</td>
                <td className="px-4 py-2">{item.servicio.nombre}</td>
                <td className="px-4 py-2 font-mono">{item.dia.itinerario.reserva.codigoReserva}</td>
                <td className="px-4 py-2">{item.dia.itinerario.reserva.cliente.nombre}</td>
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
