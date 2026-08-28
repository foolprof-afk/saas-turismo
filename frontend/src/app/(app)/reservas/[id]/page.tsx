"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface ReservaDetalle {
  codigoReserva: string;
  estado: string;
  total: string;
  cliente: { nombre: string; email?: string };
  pasajeros: { nombre: string; tipo: string }[];
  voucher?: { qrUrl: string; codigo: string; validoHasta?: string };
  itinerario?: {
    dias: {
      numeroDia: number;
      fecha: string;
      servicios: { horaInicio: string; estado: string; servicio: { nombre: string } }[];
    }[];
  };
}

export default function ReservaDetallePage() {
  const params = useParams<{ id: string }>();
  const [reserva, setReserva] = useState<ReservaDetalle | null>(null);

  useEffect(() => {
    api.get<ReservaDetalle>(`/reservas/${params.id}`).then(setReserva).catch(() => null);
  }, [params.id]);

  if (!reserva) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reserva {reserva.codigoReserva}</h1>
          <p className="text-sm text-gray-500">{reserva.cliente?.nombre}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">{reserva.estado}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Voucher</h2>
          {reserva.voucher ? (
            <div className="flex flex-col items-center gap-2">
              <img src={reserva.voucher.qrUrl} alt="QR del voucher" className="h-40 w-40" />
              <p className="font-mono text-sm">{reserva.voucher.codigo}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin voucher generado</p>
          )}
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Pasajeros</h2>
          <ul className="space-y-1 text-sm">
            {reserva.pasajeros.map((p, i) => (
              <li key={i}>
                {p.nombre} <span className="text-gray-400">({p.tipo})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {reserva.itinerario && (
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Itinerario</h2>
          <div className="space-y-3">
            {reserva.itinerario.dias.map((dia) => (
              <div key={dia.numeroDia}>
                <p className="text-sm font-medium">
                  Día {dia.numeroDia} — {new Date(dia.fecha).toLocaleDateString()}
                </p>
                <ul className="ml-4 list-disc text-sm text-gray-600">
                  {dia.servicios.map((s, i) => (
                    <li key={i}>
                      {s.horaInicio} — {s.servicio.nombre}{" "}
                      <span className="text-xs text-gray-400">({s.estado})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
