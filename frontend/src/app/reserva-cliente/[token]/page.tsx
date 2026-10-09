"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatFecha, formatFechaHora } from "@/lib/fecha";
import { formatMonto } from "@/lib/moneda";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface MontoPorMoneda {
  monedaId: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  total: number;
}

interface Pago {
  monto: string;
  formaPago: { nombre: string };
  moneda: { codigo: string; simbolo: string };
  referenciaExterna?: string | null;
  fecha: string;
}

interface ReservaPublica {
  codigoReserva: string;
  estado: string;
  total: string | null;
  montos: MontoPorMoneda[];
  totalAbonado: MontoPorMoneda[];
  saldoPendiente: MontoPorMoneda[];
  totalEnMonedaReserva: MontoPorMoneda | null;
  totalAbonadoEnMonedaReserva: MontoPorMoneda | null;
  saldoPendienteEnMonedaReserva: MontoPorMoneda | null;
  pagos: Pago[];
  fechaServicioInicio: string;
  horaServicio?: string | null;
  notas?: string | null;
  cotizacion?: { notas?: string | null } | null;
  // "cliente" es la identidad comercial/agencia bajo la cual se vendió la reserva (no el
  // pasajero final, ver Cliente en el schema): de cara al pasajero que recibe este enlace, esto
  // es "la agencia" que emite la reserva, así que se rotula como tal en pantalla.
  cliente: { nombre: string; logoUrl?: string | null; urlTerminosCondiciones?: string | null };
  agencia?: { logoUrl?: string | null; nombre?: string } | null;
  pasajeros: { nombre: string; telefono?: string | null; tipo: string; esResponsable?: boolean }[];
  itinerario?: {
    dias: {
      numeroDia: number;
      fecha: string;
      servicios: {
        horaInicio: string;
        estado: string;
        servicio: { nombre: string; descripcion?: string | null; duracionMin?: number | null };
        precio?: string | null;
        moneda?: { codigo: string; simbolo: string } | null;
      }[];
    }[];
  };
}

function logoDe(reserva: ReservaPublica): string | undefined {
  return reserva.cliente?.logoUrl || reserva.agencia?.logoUrl || undefined;
}

function montosTexto(montos: MontoPorMoneda[]): string {
  if (!montos || montos.length === 0) return "-";
  return montos.map((m) => `${m.monedaSimbolo} ${formatMonto(m.total)} ${m.monedaCodigo}`).join(", ");
}

function montoTexto(monto: MontoPorMoneda | null): string {
  if (!monto) return "-";
  return `${monto.monedaSimbolo} ${formatMonto(monto.total)} ${monto.monedaCodigo}`;
}

// Notas propias de la reserva; si no tiene, se usan las de la cotización de origen.
function notasDe(reserva: ReservaPublica): string | null {
  return reserva.notas || reserva.cotizacion?.notas || null;
}

export default function ReservaClientePublicaPage() {
  const params = useParams<{ token: string }>();
  const [reserva, setReserva] = useState<ReservaPublica | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/reserva-cliente/publico/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: "No se pudo validar el enlace" }));
          throw new Error(body.message ?? "No se pudo validar el enlace");
        }
        return res.json();
      })
      .then(setReserva)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo validar el enlace"));
  }, [params.token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm rounded-lg border bg-white p-6 text-center">
          <p className="text-lg font-semibold text-red-600">Enlace inválido</p>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!reserva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Cargando reserva...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border bg-white p-5 text-center">
          {logoDe(reserva) && (
            <img
              src={logoDe(reserva)}
              alt={reserva.agencia?.nombre ?? "Logo"}
              className="mx-auto mb-2 h-16 w-16 object-contain"
            />
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {reserva.agencia?.nombre ?? "Reserva"}
          </p>
          <h1 className="mt-1 text-xl font-bold">Reserva {reserva.codigoReserva}</h1>
          <span className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs">{reserva.estado}</span>
          <p className="mt-2 text-xs text-gray-400">
            Guarda este enlace: siempre muestra la versión más reciente de tu reserva, aunque la agencia
            la modifique después.
          </p>
        </div>

        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5 text-center">
          <h2 className="mb-1 text-sm font-semibold text-blue-700">Total</h2>
          <p className="text-2xl font-bold text-blue-800">
            {reserva.totalEnMonedaReserva ? montoTexto(reserva.totalEnMonedaReserva) : montosTexto(reserva.montos)}
          </p>
          {reserva.totalAbonado.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-blue-200 pt-3 text-sm">
              <p className="text-blue-700">
                Abonado:{" "}
                {reserva.totalAbonadoEnMonedaReserva
                  ? montoTexto(reserva.totalAbonadoEnMonedaReserva)
                  : montosTexto(reserva.totalAbonado)}
              </p>
              <p className="font-medium text-amber-700">
                Saldo pendiente:{" "}
                {reserva.saldoPendienteEnMonedaReserva
                  ? montoTexto(reserva.saldoPendienteEnMonedaReserva)
                  : montosTexto(reserva.saldoPendiente)}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Datos de la reserva</h2>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-gray-400">Agencia:</span> {reserva.cliente?.nombre}
            </p>
            <p>
              <span className="text-gray-400">Fecha:</span> {formatFecha(reserva.fechaServicioInicio)}
              {reserva.horaServicio ? ` — ${reserva.horaServicio}` : ""}
            </p>
            <p>
              <span className="text-gray-400">Pasajeros:</span> {reserva.pasajeros.length}
            </p>
          </div>
        </div>

        {notasDe(reserva) && (
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Notas</h2>
            <p className="whitespace-pre-line text-sm text-gray-700">{notasDe(reserva)}</p>
          </div>
        )}

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Pasajeros ({reserva.pasajeros.length})</h2>
          <ul className="space-y-1 text-sm">
            {reserva.pasajeros.map((p, i) => (
              <li key={i}>
                {p.nombre} <span className="text-gray-400">({p.tipo})</span>
                {p.esResponsable && (
                  <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    Responsable
                  </span>
                )}
                {p.telefono && <span className="text-gray-400"> — {p.telefono}</span>}
              </li>
            ))}
          </ul>
        </div>

        {reserva.itinerario && reserva.itinerario.dias.length > 0 && (
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Itinerario</h2>
            <div className="space-y-3">
              {reserva.itinerario.dias.map((dia) => (
                <div key={dia.numeroDia}>
                  <p className="text-sm font-medium">
                    Día {dia.numeroDia} — {formatFecha(dia.fecha)}
                  </p>
                  <ul className="ml-4 list-disc text-sm text-gray-600">
                    {dia.servicios.map((s, i) => (
                      <li key={i}>
                        {s.horaInicio} — {s.servicio.nombre}{" "}
                        {s.precio && s.moneda && (
                          <span className="text-gray-500">
                            ({s.moneda.simbolo}
                            {formatMonto(s.precio)} {s.moneda.codigo})
                          </span>
                        )}
                        {s.servicio.descripcion && (
                          <p className="mt-0.5 whitespace-pre-line text-xs text-gray-500">{s.servicio.descripcion}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {reserva.pagos && reserva.pagos.length > 0 && (
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Pagos registrados</h2>
            <ul className="space-y-1 text-sm">
              {reserva.pagos.map((p, i) => (
                <li key={i}>
                  {p.formaPago?.nombre} — {p.moneda?.simbolo}
                  {formatMonto(p.monto)} {p.moneda?.codigo}
                  {p.referenciaExterna && <span className="text-gray-400"> (Ref: {p.referenciaExterna})</span>}
                  <span className="block text-xs text-gray-400">{formatFechaHora(p.fecha)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border bg-white p-5 text-sm text-gray-700">
          <h2 className="mb-2 font-semibold text-gray-800">Condiciones de reserva</h2>
          <p className="mb-2">
            Tu reservación se confirma con el anticipo o pago correspondiente y está sujeta a disponibilidad.
          </p>
          <p className="mb-2">
            Los pagos de reservas confirmadas son no reembolsables, salvo las excepciones legales o condiciones
            especiales informadas. Puedes solicitar cambios de fecha sujetos a disponibilidad y posibles
            diferencias de tarifa.
          </p>
          <p className="mb-2">
            Los horarios e itinerarios pueden modificarse por clima, seguridad o circunstancias operativas.
          </p>
          <p className="mb-2">Al confirmar tu reserva, aceptas los términos y condiciones aplicables.</p>
          {reserva.cliente?.urlTerminosCondiciones && (
            <p>
              <span className="font-semibold">Consulta nuestras políticas completas:</span>{" "}
              <a
                href={reserva.cliente.urlTerminosCondiciones}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-600 hover:underline"
              >
                {reserva.cliente.urlTerminosCondiciones}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
