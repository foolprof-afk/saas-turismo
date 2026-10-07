"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCarrito } from "@/lib/catalogo/cart-context";
import { formatDias } from "@/lib/catalogo/dias";
import { formatMonto } from "@/lib/moneda";

// Barra flotante "carrito de compra" del catálogo público: muestra cuántos servicios se han
// agregado, el total de días estimados del viaje y el subtotal por cada moneda involucrada
// (los servicios de una misma agencia pueden tener monedas distintas, ver
// CarritoProvider.subtotalesPorMoneda). Se oculta si el carrito está vacío o en la propia
// página de "Mi viaje" (para no duplicar la información que ya se ve ahí).
export function CarritoBar() {
  const { items, totalDiasEstimados, subtotalesPorMoneda, listo } = useCarrito();
  const pathname = usePathname();

  if (!listo || items.length === 0 || pathname === "/catalogo/mi-viaje") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {items.length}
            </span>
            <span className="text-sm text-gray-700">
              {items.length === 1 ? "servicio agregado" : "servicios agregados"}
            </span>
          </div>
          <span className="hidden text-sm text-gray-500 sm:inline">·</span>
          <span className="hidden text-sm text-gray-700 sm:inline">
            {formatDias(totalDiasEstimados)} estimados
          </span>
          <span className="hidden text-sm text-gray-500 sm:inline">·</span>
          <div className="hidden flex-wrap gap-2 sm:flex">
            {subtotalesPorMoneda.map((s) => (
              <span key={s.moneda.codigo} className="text-sm font-medium text-gray-900">
                {s.moneda.simbolo} {formatMonto(s.subtotal)} {s.moneda.codigo}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/catalogo/mi-viaje"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Ver mi viaje
        </Link>
      </div>
    </div>
  );
}
