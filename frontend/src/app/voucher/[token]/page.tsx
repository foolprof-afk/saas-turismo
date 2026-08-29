"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface ReservaPublica {
  codigoReserva: string;
  estado: string;
  total: string;
  fechaServicioInicio: string;
  horaServicio?: string | null;
  cliente: { nombre: string };
  pasajeros: { nombre: string; telefono?: string | null; tipo: string }[];
  voucher?: { codigo: string; validoHasta?: string };
  itinerario?: {
    dias: {
      numeroDia: number;
      fecha: string;
      servicios: { horaInicio: string; estado: string; servicio: { nombre: string } }[];
    }[];
  };
}

export default function VoucherPublicoPage() {
  const params = useParams<{ token: string }>();
  const [reserva, setReserva] = useState<ReservaPublica | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/vouchers/publico/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: "No se pudo validar el voucher" }));
          throw new Error(body.message ?? "No se pudo validar el voucher");
        }
        return res.json();
      })
      .then(setReserva)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo validar el voucher"));
  }, [params.token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm rounded-lg border bg-white p-6 text-center">
          <p className="text-lg font-semibold text-red-600">Voucher inválido</p>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!reserva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Validando reserva...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-lg border bg-white p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Reserva válida</p>
          <h1 className="mt-1 text-xl font-bold">{reserva.codigoReserva}</h1>
          <span className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm">{reserva.estado}</span>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Detalle</h2>
          <p className="text-sm">
            <span className="text-gray-500">Cliente:</span> {reserva.cliente?.nombre}
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Fecha:</span>{" "}
            {new Date(reserva.fechaServicioInicio).toLocaleDateString()}
            {reserva.horaServicio ? ` — ${reserva.horaServicio}` : ""}
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Total:</span> {reserva.total}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Pasajeros</h2>
          <ul className="space-y-1 text-sm">
            {reserva.pasajeros.map((p, i) => (
              <li key={i}>
                {p.nombre} <span className="text-gray-400">({p.tipo})</span>
                {p.telefono && <span className="text-gray-400"> — {p.telefono}</span>}
              </li>
            ))}
          </ul>
        </div>

        {reserva.itinerario && (
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Itinerario</h2>
            <div className="space-y-3">
              {reserva.itinerario.dias.map((dia) => (
                <div key={dia.numeroDia}>
                  <p className="text-sm font-medium">
                    Día {dia.numeroDia} — {new Date(dia.fecha).toLocaleDateString()}
                  </p>
                  <ul className="ml-4 list-disc text-sm text-gray-600">
                    {dia.servicios.map((s, i) => (
                      <li key={i}>
                        {s.horaInicio} — {s.servicio.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
