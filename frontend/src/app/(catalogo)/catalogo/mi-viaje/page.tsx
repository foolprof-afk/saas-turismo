"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCarrito } from "@/lib/catalogo/cart-context";
import { diasPorServicio, formatDias } from "@/lib/catalogo/dias";
import { formatMonto } from "@/lib/moneda";

// Página "Mi viaje": revisión del carrito + formulario de contacto para solicitar la
// cotización. Al finalizar siempre pide correo electrónico, teléfono y nombre completo (ver
// PRD Guatetur Front Office, instrucción explícita del cliente), que se envían como
// emailResponsable / telefonoResponsable / pasajeroResponsable al crear la cotización.
export default function MiViajePage() {
  const { items, cantidadPersonas, setCantidadPersonas, quitar, vaciar, totalDiasEstimados, subtotalesPorMoneda, listo } =
    useCarrito();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  const puedeEnviar = items.length > 0 && nombre.trim() && email.trim() && telefono.trim() && fecha.trim();

  async function solicitar() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/catalogo-proxy/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cantidadPersonas,
          pasajeroResponsable: nombre.trim(),
          emailResponsable: email.trim(),
          telefonoResponsable: telefono.trim(),
          fechaServicio: new Date(fecha).toISOString(),
          notas: `Días estimados del viaje: ${formatDias(totalDiasEstimados)}.${notas ? ` ${notas}` : ""}`,
          items: items.map((item) => ({ servicioId: item.servicioId })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "No se pudo enviar la solicitud");
      }
      setCodigo(data.codigoCotizacion);
      vaciar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la solicitud");
    } finally {
      setEnviando(false);
    }
  }

  if (codigo) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">¡Solicitud enviada!</h1>
        <p className="mt-3 text-gray-600">
          Tu código de cotización es <span className="font-mono font-semibold">{codigo}</span>. Nuestro equipo se
          pondrá en contacto contigo por correo o teléfono para confirmar los detalles de tu viaje.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  if (listo && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Tu viaje está vacío</h1>
        <p className="mt-2 text-sm text-gray-500">Agrega servicios desde el catálogo para armar tu viaje.</p>
        <Link
          href="/catalogo"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/catalogo" className="text-sm text-emerald-700 hover:underline">
        ← Seguir explorando el catálogo
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Mi viaje</h1>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Lista de servicios */}
        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div key={item.servicioId} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                {item.fotoUrl ? (
                  <Image src={item.fotoUrl} alt={item.nombre} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-gray-400">Sin foto</div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                <p className="text-xs text-gray-500">{formatDias(diasPorServicio(item.duracionMin))}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {item.moneda.simbolo} {formatMonto(item.precioBase)}{" "}
                  <span className="text-xs font-normal text-gray-500">{item.moneda.codigo}</span>
                </p>
                <button type="button" onClick={() => quitar(item.servicioId)} className="text-xs text-red-600 hover:underline">
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen + formulario */}
        <div className="w-full flex-shrink-0 space-y-4 lg:w-96">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Resumen</h2>

            <div className="mt-3 flex items-center justify-between text-sm">
              <label htmlFor="cantidadPersonas" className="text-gray-600">
                Cantidad de personas
              </label>
              <input
                id="cantidadPersonas"
                type="number"
                min={1}
                value={cantidadPersonas}
                onChange={(e) => setCantidadPersonas(Number(e.target.value) || 1)}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-right"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Días estimados del viaje</span>
              <span className="font-semibold text-gray-900">{formatDias(totalDiasEstimados)}</span>
            </div>

            <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
              {subtotalesPorMoneda.map((s) => (
                <div key={s.moneda.codigo} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal ({s.cantidadItems} {s.cantidadItems === 1 ? "servicio" : "servicios"})
                  </span>
                  <span className="font-semibold text-gray-900">
                    {s.moneda.simbolo} {formatMonto(s.subtotal)} {s.moneda.codigo}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-xs text-gray-400">
                Precios por persona; el total final puede variar según la cantidad de personas y se confirmará en tu
                cotización.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Tus datos de contacto</h2>
            <p className="mt-1 text-xs text-gray-500">
              Los necesitamos para poder enviarte la cotización completa de tu viaje.
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Nombre completo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Correo electrónico *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Teléfono *</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Fecha estimada de inicio *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Notas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={!puedeEnviar || enviando}
              onClick={solicitar}
              className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Solicitar mi viaje"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
