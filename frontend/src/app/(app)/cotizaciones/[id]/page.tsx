"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

interface CotizacionItem {
  id: string;
  precioUnitario: string;
  servicio: { nombre: string; descripcion?: string | null };
  moneda: { codigo: string; simbolo: string };
}

interface CotizacionDetalle {
  id: string;
  codigoCotizacion: string;
  estado: string;
  cantidadPersonas: number;
  pasajeroResponsable: string;
  documentoResponsable?: string | null;
  telefonoResponsable?: string | null;
  fechaServicio: string;
  notas?: string | null;
  cliente: { nombre: string };
  vendedor: { nombre: string };
  listaPrecio?: { nombre: string; porcentajeAdicional: string } | null;
  reserva?: { id: string; codigoReserva: string } | null;
  agencia?: { logoUrl?: string | null; nombre?: string } | null;
  items: CotizacionItem[];
}

function logoDe(cotizacion: CotizacionDetalle): string | undefined {
  return cotizacion.agencia?.logoUrl || undefined;
}

function formatoImagenDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  return match ? match[1].toUpperCase() : "PNG";
}

function totalesPorMoneda(cotizacion: CotizacionDetalle) {
  const porMoneda = new Map<string, { total: number; codigo: string; simbolo: string }>();
  for (const item of cotizacion.items) {
    const entry = porMoneda.get(item.moneda.codigo) ?? { total: 0, codigo: item.moneda.codigo, simbolo: item.moneda.simbolo };
    entry.total += Number(item.precioUnitario) * cotizacion.cantidadPersonas;
    porMoneda.set(item.moneda.codigo, entry);
  }
  return Array.from(porMoneda.values());
}

export default function CotizacionDetallePage() {
  const params = useParams<{ id: string }>();
  const [cotizacion, setCotizacion] = useState<CotizacionDetalle | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    api.get<CotizacionDetalle>(`/cotizaciones/${params.id}`).then(setCotizacion).catch(() => null);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!cotizacion) return <p className="text-sm text-gray-400">Cargando...</p>;

  const totales = totalesPorMoneda(cotizacion);

  const handleConfirmar = async () => {
    if (!confirm("¿Confirmar esta cotización y transformarla en una reserva?")) return;
    setConfirmando(true);
    setError(null);
    try {
      await api.patch(`/cotizaciones/${cotizacion.id}/confirmar`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar la cotización");
    } finally {
      setConfirmando(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm("¿Cancelar esta cotización?")) return;
    setCancelando(true);
    setError(null);
    try {
      await api.patch(`/cotizaciones/${cotizacion.id}/cancelar`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cancelar la cotización");
    } finally {
      setCancelando(false);
    }
  };

  const descargarPDF = async () => {
    const { jsPDF } = await import("jspdf");

    const lineas: string[] = [];
    lineas.push(`Responsable: ${cotizacion.pasajeroResponsable}`);
    lineas.push(`Cantidad de personas: ${cotizacion.cantidadPersonas}`);
    lineas.push(`Fecha: ${new Date(cotizacion.fechaServicio).toLocaleDateString()}`);
    lineas.push("");
    lineas.push("Servicios:");
    cotizacion.items.forEach((item) => {
      const subtotal = Number(item.precioUnitario) * cotizacion.cantidadPersonas;
      lineas.push(
        `- ${item.servicio.nombre} x${cotizacion.cantidadPersonas} = ${item.moneda.simbolo}${subtotal.toFixed(2)} ${item.moneda.codigo}`,
      );
      if (item.servicio.descripcion) lineas.push(`  ${item.servicio.descripcion}`);
    });
    lineas.push("");
    totales.forEach((t) => lineas.push(`Total ${t.codigo}: ${t.simbolo}${t.total.toFixed(2)}`));
    if (cotizacion.notas) {
      lineas.push("");
      lineas.push(`Notas: ${cotizacion.notas}`);
    }

    const logo = logoDe(cotizacion);
    const logoSizeMm = 20;
    const lineHeightMm = 5;
    const alturaMm = 30 + lineas.length * lineHeightMm + (logo ? logoSizeMm + 5 : 0);

    const doc = new jsPDF({ unit: "mm", format: [80, Math.max(alturaMm, 100)] });
    let y = 10;
    if (logo) {
      doc.addImage(logo, formatoImagenDataUrl(logo), (80 - logoSizeMm) / 2, y, logoSizeMm, logoSizeMm);
      y += logoSizeMm + 5;
    }
    doc.setFontSize(12);
    doc.text(`Cotización ${cotizacion.codigoCotizacion}`, 5, y);
    y += 7;
    doc.setFontSize(9);
    lineas.forEach((linea) => {
      const wrapped = doc.splitTextToSize(linea, 70);
      doc.text(wrapped, 5, y);
      y += wrapped.length * lineHeightMm;
    });
    doc.save(`${cotizacion.codigoCotizacion}.pdf`);
  };

  const textoResumen = [
    `Cotización ${cotizacion.codigoCotizacion}`,
    `Responsable: ${cotizacion.pasajeroResponsable} (${cotizacion.cantidadPersonas} personas)`,
    `Fecha: ${new Date(cotizacion.fechaServicio).toLocaleDateString()}`,
    "",
    ...cotizacion.items.map((item) => {
      const subtotal = Number(item.precioUnitario) * cotizacion.cantidadPersonas;
      return `- ${item.servicio.nombre} x${cotizacion.cantidadPersonas} = ${item.moneda.simbolo}${subtotal.toFixed(2)} ${item.moneda.codigo}`;
    }),
    "",
    ...totales.map((t) => `Total ${t.codigo}: ${t.simbolo}${t.total.toFixed(2)}`),
  ].join("\n");

  const linkWhatsapp = cotizacion.telefonoResponsable
    ? `https://wa.me/${cotizacion.telefonoResponsable.replace(/\D/g, "")}?text=${encodeURIComponent(textoResumen)}`
    : null;
  const linkCorreo = `mailto:?subject=${encodeURIComponent(
    `Cotización ${cotizacion.codigoCotizacion}`,
  )}&body=${encodeURIComponent(textoResumen)}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cotización {cotizacion.codigoCotizacion}</h1>
          <p className="text-sm text-gray-500">{cotizacion.pasajeroResponsable}</p>
          <p className="text-sm text-gray-500">{new Date(cotizacion.fechaServicio).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">{cotizacion.estado}</span>
          {totales.map((t) => (
            <p key={t.codigo} className="text-lg font-semibold">
              {t.simbolo} {t.total.toFixed(2)} {t.codigo}
            </p>
          ))}
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={descargarPDF} className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50">
              Descargar PDF
            </button>
            <a
              href={linkCorreo}
              className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50"
            >
              Enviar por correo
            </a>
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
          {cotizacion.estado === "PENDIENTE" && (
            <div className="flex gap-3">
              <button
                onClick={handleConfirmar}
                disabled={confirmando}
                className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {confirmando ? "Confirmando..." : "Confirmar cotización"}
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelando}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                {cancelando ? "Cancelando..." : "Cancelar"}
              </button>
            </div>
          )}
          {cotizacion.reserva && (
            <Link href={`/reservas/${cotizacion.reserva.id}`} className="text-sm text-blue-600 hover:underline">
              Ver reserva {cotizacion.reserva.codigoReserva}
            </Link>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">Datos del responsable</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>
            <span className="text-gray-400">Nombre:</span> {cotizacion.pasajeroResponsable}
          </p>
          <p>
            <span className="text-gray-400">Cantidad de personas:</span> {cotizacion.cantidadPersonas}
          </p>
          {cotizacion.documentoResponsable && (
            <p>
              <span className="text-gray-400">Documento:</span> {cotizacion.documentoResponsable}
            </p>
          )}
          {cotizacion.telefonoResponsable && (
            <p>
              <span className="text-gray-400">Teléfono:</span> {cotizacion.telefonoResponsable}
            </p>
          )}
          <p>
            <span className="text-gray-400">Vendedor:</span> {cotizacion.vendedor?.nombre}
          </p>
          {cotizacion.listaPrecio && (
            <p>
              <span className="text-gray-400">Lista de precio:</span> {cotizacion.listaPrecio.nombre} (+
              {cotizacion.listaPrecio.porcentajeAdicional}%)
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">Servicios cotizados</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1">Servicio</th>
              <th className="py-1">Cantidad</th>
              <th className="py-1">Precio unitario</th>
              <th className="py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.items.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="py-2">
                  <p className="font-medium">{item.servicio.nombre}</p>
                  {item.servicio.descripcion && (
                    <p className="text-xs text-gray-400">{item.servicio.descripcion}</p>
                  )}
                </td>
                <td className="py-2">{cotizacion.cantidadPersonas}</td>
                <td className="py-2">
                  {item.moneda.simbolo}
                  {Number(item.precioUnitario).toFixed(2)} {item.moneda.codigo}
                </td>
                <td className="py-2">
                  {item.moneda.simbolo}
                  {(Number(item.precioUnitario) * cotizacion.cantidadPersonas).toFixed(2)} {item.moneda.codigo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cotizacion.notas && (
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Notas</h2>
          <p className="text-sm text-gray-700">{cotizacion.notas}</p>
        </div>
      )}
    </div>
  );
}
