"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface CotizacionItem {
  id: string;
  dia: number;
  precioUnitario: string;
  servicio: { nombre: string; descripcion?: string | null; duracionMin?: number | null };
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

function horasDe(item: CotizacionItem): string | null {
  return item.servicio.duracionMin ? (item.servicio.duracionMin / 60).toFixed(1) : null;
}

function agruparPorDia(cotizacion: CotizacionDetalle) {
  const dias = new Map<number, CotizacionItem[]>();
  for (const item of cotizacion.items) {
    const dia = item.dia || 1;
    if (!dias.has(dia)) dias.set(dia, []);
    dias.get(dia)!.push(item);
  }
  return Array.from(dias.entries()).sort((a, b) => a[0] - b[0]);
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
  const { usuario } = useAuth();
  const verPorcentajes = usuario?.rol === "admin";
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

    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const marginBottom = 15;
    const anchoUtil = pageWidth - marginX * 2;
    let y = 15;

    const saltoDePaginaSiNecesario = (alturaNecesaria: number) => {
      if (y + alturaNecesaria > pageHeight - marginBottom) {
        doc.addPage();
        y = 15;
      }
    };

    const logo = logoDe(cotizacion);
    if (logo) {
      const logoSizeMm = 18;
      doc.addImage(logo, formatoImagenDataUrl(logo), marginX, y, logoSizeMm, logoSizeMm);
    }
    doc.setFontSize(16);
    doc.text(`Cotización ${cotizacion.codigoCotizacion}`, pageWidth - marginX, y + 5, { align: "right" });
    doc.setFontSize(10);
    doc.text(`Estado: ${cotizacion.estado}`, pageWidth - marginX, y + 11, { align: "right" });
    if (cotizacion.agencia?.nombre) {
      doc.text(cotizacion.agencia.nombre, pageWidth - marginX, y + 17, { align: "right" });
    }
    y += 26;

    doc.setDrawColor(200);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;

    doc.setFontSize(10);
    const datos: [string, string][] = [
      ["Responsable", cotizacion.pasajeroResponsable],
      ["Cantidad de personas", String(cotizacion.cantidadPersonas)],
      ["Fecha", new Date(cotizacion.fechaServicio).toLocaleDateString()],
      ["Vendedor", cotizacion.vendedor?.nombre ?? "-"],
    ];
    if (cotizacion.documentoResponsable) datos.push(["Documento", cotizacion.documentoResponsable]);
    if (cotizacion.telefonoResponsable) datos.push(["Teléfono", cotizacion.telefonoResponsable]);
    if (cotizacion.listaPrecio) {
      datos.push([
        "Lista de precio",
        verPorcentajes
          ? `${cotizacion.listaPrecio.nombre} (+${cotizacion.listaPrecio.porcentajeAdicional}%)`
          : cotizacion.listaPrecio.nombre,
      ]);
    }
    const colAncho = anchoUtil / 2;
    datos.forEach(([label, valor], i) => {
      const col = i % 2;
      const fila = Math.floor(i / 2);
      const x = marginX + col * colAncho;
      const filaY = y + fila * 6;
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, x, filaY);
      doc.setFont("helvetica", "normal");
      doc.text(valor, x + 38, filaY);
    });
    y += Math.ceil(datos.length / 2) * 6 + 6;

    doc.setDrawColor(200);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Servicios cotizados", marginX, y);
    doc.setFont("helvetica", "normal");
    y += 7;

    const colX = {
      dia: marginX,
      servicio: marginX + 15,
      horas: marginX + 100,
      cantidad: marginX + 118,
      unitario: marginX + 138,
      subtotal: marginX + 165,
    };

    const dibujarEncabezadoTabla = () => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Día", colX.dia, y);
      doc.text("Servicio", colX.servicio, y);
      doc.text("Horas", colX.horas, y);
      doc.text("Cant.", colX.cantidad, y);
      doc.text("P. unit.", colX.unitario, y);
      doc.text("Subtotal", colX.subtotal, y);
      doc.setFont("helvetica", "normal");
      y += 2;
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 5;
    };

    saltoDePaginaSiNecesario(15);
    dibujarEncabezadoTabla();

    agruparPorDia(cotizacion).forEach(([dia, itemsDia]) => {
      itemsDia.forEach((item, idx) => {
        const subtotal = Number(item.precioUnitario) * cotizacion.cantidadPersonas;
        const horas = horasDe(item);
        const nombreLineas = doc.splitTextToSize(item.servicio.nombre, colX.horas - colX.servicio - 3);
        const descLineas = item.servicio.descripcion
          ? doc.splitTextToSize(item.servicio.descripcion, colX.horas - colX.servicio - 3)
          : [];
        const alturaFila = (nombreLineas.length + descLineas.length) * 4.5 + 2;

        saltoDePaginaSiNecesario(alturaFila + 5);
        if (idx === 0) {
          doc.setFont("helvetica", "bold");
          doc.text(`Día ${dia}`, colX.dia, y);
          doc.setFont("helvetica", "normal");
        }
        doc.setFontSize(9);
        doc.text(nombreLineas, colX.servicio, y);
        doc.text(horas ? `${horas} h` : "-", colX.horas, y);
        doc.text(String(cotizacion.cantidadPersonas), colX.cantidad, y);
        doc.text(`${item.moneda.simbolo}${Number(item.precioUnitario).toFixed(2)}`, colX.unitario, y);
        doc.text(`${item.moneda.simbolo}${subtotal.toFixed(2)}`, colX.subtotal, y);
        y += nombreLineas.length * 4.5;
        if (descLineas.length) {
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(descLineas, colX.servicio, y);
          doc.setTextColor(0);
          y += descLineas.length * 4.5;
        }
        y += 2;
      });
    });

    y += 4;
    saltoDePaginaSiNecesario(6 * totales.length + 10);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;
    doc.setFontSize(11);
    totales.forEach((t) => {
      doc.setFont("helvetica", "bold");
      doc.text(`Total ${t.codigo}: ${t.simbolo}${t.total.toFixed(2)}`, pageWidth - marginX, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6;
    });

    if (cotizacion.notas) {
      y += 4;
      saltoDePaginaSiNecesario(15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Notas", marginX, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      doc.setFontSize(9);
      const notasLineas = doc.splitTextToSize(cotizacion.notas, anchoUtil);
      doc.text(notasLineas, marginX, y);
    }

    doc.save(`${cotizacion.codigoCotizacion}.pdf`);
  };

  const textoResumen = [
    `Cotización ${cotizacion.codigoCotizacion}`,
    `Responsable: ${cotizacion.pasajeroResponsable} (${cotizacion.cantidadPersonas} personas)`,
    `Fecha: ${new Date(cotizacion.fechaServicio).toLocaleDateString()}`,
    "",
    ...agruparPorDia(cotizacion).flatMap(([dia, itemsDia]) => [
      `Día ${dia}:`,
      ...itemsDia.map((item) => {
        const subtotal = Number(item.precioUnitario) * cotizacion.cantidadPersonas;
        const horas = horasDe(item);
        return `- ${item.servicio.nombre}${horas ? ` (${horas} h)` : ""} x${cotizacion.cantidadPersonas} = ${item.moneda.simbolo}${subtotal.toFixed(2)} ${item.moneda.codigo}`;
      }),
    ]),
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
              <span className="text-gray-400">Lista de precio:</span> {cotizacion.listaPrecio.nombre}
              {verPorcentajes ? ` (+${cotizacion.listaPrecio.porcentajeAdicional}%)` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">Servicios cotizados</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1">Día</th>
              <th className="py-1">Servicio</th>
              <th className="py-1">Horas</th>
              <th className="py-1">Cantidad</th>
              <th className="py-1">Precio unitario</th>
              <th className="py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {agruparPorDia(cotizacion).map(([dia, itemsDia]) =>
              itemsDia.map((item, idx) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="py-2">{idx === 0 ? `Día ${dia}` : ""}</td>
                  <td className="py-2">
                    <p className="font-medium">{item.servicio.nombre}</p>
                    {item.servicio.descripcion && (
                      <p className="text-xs text-gray-400">{item.servicio.descripcion}</p>
                    )}
                  </td>
                  <td className="py-2">{horasDe(item) ?? "-"}</td>
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
              )),
            )}
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
