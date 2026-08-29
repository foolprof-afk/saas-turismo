"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

interface ReservaDetalle {
  id: string;
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

interface FormaPago {
  id: string;
  nombre: string;
}

interface Pago {
  id: string;
  monto: string;
  formaPago: { nombre: string };
  referenciaExterna?: string | null;
  comprobanteUrl?: string | null;
  fecha: string;
  estado: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [formaPagoId, setFormaPagoId] = useState("");
  const [referenciaExterna, setReferenciaExterna] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState<string | undefined>(undefined);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esEfectivo = formasPago.find((f) => f.id === formaPagoId)?.nombre.toLowerCase() === "efectivo";

  const cargar = () => {
    api.get<ReservaDetalle>(`/reservas/${params.id}`).then(setReserva).catch(() => null);
    api.get<Pago[]>(`/pagos/reserva/${params.id}`).then(setPagos).catch(() => setPagos([]));
  };

  useEffect(() => {
    cargar();
    api.get<FormaPago[]>("/formas-pago").then(setFormasPago).catch(() => setFormasPago([]));
  }, [params.id]);

  const handleConfirmar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmando(true);
    try {
      await api.patch(`/reservas/${params.id}/confirmar`, {
        formaPagoId,
        referenciaExterna: referenciaExterna || undefined,
        comprobanteUrl,
      });
      setFormaPagoId("");
      setReferenciaExterna("");
      setComprobanteUrl(undefined);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar la reserva");
    } finally {
      setConfirmando(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    setCancelando(true);
    try {
      await api.patch(`/reservas/${params.id}/cancelar`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cancelar la reserva");
    } finally {
      setCancelando(false);
    }
  };

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
          <p className="mt-2 text-lg font-semibold">{reserva.total}</p>
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
          {reserva.estado !== "CANCELADA" && (
            <button
              onClick={handleCancelar}
              disabled={cancelando}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {cancelando ? "Cancelando..." : "Cancelar reserva"}
            </button>
          )}
        </div>
      </div>

      {reserva.estado === "PENDIENTE" && (
        <div className="rounded-lg border bg-white p-5 print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Confirmar reserva</h2>
          <form onSubmit={handleConfirmar} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Forma de pago</label>
              <select
                required
                value={formaPagoId}
                onChange={(e) => setFormaPagoId(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Selecciona una forma de pago</option>
                {formasPago.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">
                Número/referencia de pago {esEfectivo ? "(opcional en efectivo)" : ""}
              </label>
              <input
                required={!esEfectivo}
                value={referenciaExterna}
                onChange={(e) => setReferenciaExterna(e.target.value)}
                placeholder="N° de operación, últimos dígitos, etc."
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Foto del comprobante (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  setComprobanteUrl(file ? await fileToDataUrl(file) : undefined);
                }}
                className="mt-1 w-full text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={confirmando}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {confirmando ? "Confirmando..." : "Confirmar reserva"}
            </button>
          </form>
        </div>
      )}

      {pagos.length > 0 && (
        <div className="rounded-lg border bg-white p-5 print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Pagos registrados</h2>
          <ul className="space-y-2 text-sm">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p>
                    {p.formaPago?.nombre} — {p.monto}
                  </p>
                  {p.referenciaExterna && <p className="text-xs text-gray-400">Ref: {p.referenciaExterna}</p>}
                  <p className="text-xs text-gray-400">{new Date(p.fecha).toLocaleString()}</p>
                </div>
                {p.comprobanteUrl && (
                  <a href={p.comprobanteUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Ver comprobante
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
