"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface ReservaDetalle {
  codigoReserva: string;
  estado: string;
  total: string;
  fechaServicioInicio: string;
  horaServicio?: string | null;
  cliente: { nombre: string; email?: string };
  pasajeros: { nombre: string; telefono?: string | null; tipo: string }[];
  voucher?: { qrUrl: string; codigo: string; validoHasta?: string };
  itinerario?: {
    dias: {
      numeroDia: number;
      fecha: string;
      servicios: { horaInicio: string; estado: string; servicio: { nombre: string } }[];
    }[];
  };
}

function itinerarioLineas(reserva: ReservaDetalle): string[] {
  if (!reserva.itinerario) return [];
  const lineas: string[] = [];
  reserva.itinerario.dias.forEach((dia) => {
    dia.servicios.forEach((s) => {
      lineas.push(`${s.horaInicio} ${s.servicio.nombre}`);
    });
  });
  return lineas;
}

export default function ReservaDetallePage() {
  const params = useParams<{ id: string }>();
  const [reserva, setReserva] = useState<ReservaDetalle | null>(null);

  useEffect(() => {
    api.get<ReservaDetalle>(`/reservas/${params.id}`).then(setReserva).catch(() => null);
  }, [params.id]);

  if (!reserva) return <p className="text-sm text-gray-400">Cargando...</p>;

  const descargarPDF = async () => {
    const { jsPDF } = await import("jspdf");

    const lineas: string[] = [];
    lineas.push(`Cliente: ${reserva.cliente?.nombre ?? ""}`);
    lineas.push(
      `Fecha: ${new Date(reserva.fechaServicioInicio).toLocaleDateString()}${
        reserva.horaServicio ? " " + reserva.horaServicio : ""
      }`,
    );
    lineas.push(`Total: ${reserva.total}`);
    lineas.push("");
    lineas.push("Pasajeros:");
    reserva.pasajeros.forEach((p) => {
      lineas.push(`- ${p.nombre} (${p.tipo})${p.telefono ? " " + p.telefono : ""}`);
    });
    const lineasItinerario = itinerarioLineas(reserva);
    if (lineasItinerario.length > 0) {
      lineas.push("");
      lineas.push("Itinerario:");
      lineasItinerario.forEach((l) => lineas.push(l));
    }

    const qrSizeMm = 30;
    const lineHeightMm = 5;
    const alturaMm = 30 + lineas.length * lineHeightMm + (reserva.voucher ? qrSizeMm + 10 : 0);

    const doc = new jsPDF({ unit: "mm", format: [80, Math.max(alturaMm, 100)] });
    let y = 10;
    doc.setFontSize(12);
    doc.text(`Reserva ${reserva.codigoReserva}`, 5, y);
    y += 7;
    doc.setFontSize(9);
    lineas.forEach((linea) => {
      const wrapped = doc.splitTextToSize(linea, 70);
      doc.text(wrapped, 5, y);
      y += wrapped.length * lineHeightMm;
    });
    if (reserva.voucher?.qrUrl) {
      y += 3;
      doc.addImage(reserva.voucher.qrUrl, "PNG", 25, y, qrSizeMm, qrSizeMm);
    }
    doc.save(`voucher-${reserva.codigoReserva}.pdf`);
  };

  const primerTelefono = reserva.pasajeros.find((p) => p.telefono)?.telefono;
  const linkWhatsapp = primerTelefono
    ? `https://wa.me/${primerTelefono.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola, aquí está tu voucher de la reserva ${reserva.codigoReserva}. Te lo adjunto en PDF.`,
      )}`
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Reserva {reserva.codigoReserva}</h1>
          <p className="text-sm text-gray-500">{reserva.cliente?.nombre}</p>
          <p className="text-sm text-gray-500">
            {new Date(reserva.fechaServicioInicio).toLocaleDateString()}
            {reserva.horaServicio ? ` — ${reserva.horaServicio}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">{reserva.estado}</span>
          <p className="text-lg font-semibold">{reserva.total}</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50"
            >
              Imprimir voucher
            </button>
            <button
              onClick={descargarPDF}
              className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50"
            >
              Descargar PDF
            </button>
            {linkWhatsapp && (
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                Enviar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 print:hidden">
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
                {p.telefono && <span className="text-gray-400"> — {p.telefono}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {reserva.itinerario && (
        <div className="rounded-lg border bg-white p-5 print:hidden">
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

      {/* Formato de impresión para impresora térmica (80mm), oculto en pantalla */}
      <div className="hidden w-[80mm] font-mono text-xs print:block">
        <p className="text-center text-sm font-bold">Reserva {reserva.codigoReserva}</p>
        <p>Cliente: {reserva.cliente?.nombre}</p>
        <p>
          Fecha: {new Date(reserva.fechaServicioInicio).toLocaleDateString()}
          {reserva.horaServicio ? ` ${reserva.horaServicio}` : ""}
        </p>
        <p>Total: {reserva.total}</p>
        <p className="mt-2 font-bold">Pasajeros:</p>
        {reserva.pasajeros.map((p, i) => (
          <p key={i}>
            - {p.nombre} ({p.tipo}){p.telefono ? ` ${p.telefono}` : ""}
          </p>
        ))}
        {itinerarioLineas(reserva).length > 0 && (
          <>
            <p className="mt-2 font-bold">Itinerario:</p>
            {itinerarioLineas(reserva).map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </>
        )}
        {reserva.voucher && (
          <div className="mt-3 flex flex-col items-center">
            <img src={reserva.voucher.qrUrl} alt="QR" className="h-28 w-28" />
            <p>{reserva.voucher.codigo}</p>
          </div>
        )}
      </div>
    </div>
  );
}
