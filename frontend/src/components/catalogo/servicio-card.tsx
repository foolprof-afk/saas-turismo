"use client";

import Image from "next/image";
import { ServicioCatalogo } from "@/lib/catalogo/types";
import { diasPorServicio, formatDias } from "@/lib/catalogo/dias";
import { formatMonto } from "@/lib/moneda";
import { useCarrito } from "@/lib/catalogo/cart-context";

interface Props {
  servicio: ServicioCatalogo;
}

// Tarjeta del catálogo público: foto, nombre, duración (convertida a días con la misma regla
// del carrito), precio en la moneda propia del servicio, botón Agregar/Quitar, y debajo un
// listado de "También puedes agregar" con los servicios asociados (ver Servicio.asociaciones /
// PRD "Servicios Relacionados") para agregarlos al carrito con un solo clic sin salir de la
// tarjeta.
export function ServicioCard({ servicio }: Props) {
  const { agregar, quitar, estaEnCarrito } = useCarrito();
  const enCarrito = estaEnCarrito(servicio.id);
  const dias = diasPorServicio(servicio.duracionMin);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-44 w-full bg-gray-100">
        {servicio.fotoUrl ? (
          <Image src={servicio.fotoUrl} alt={servicio.nombre} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">Sin foto</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {formatDias(dias)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900">{servicio.nombre}</h3>
        {servicio.descripcion && (
          <p className="line-clamp-2 text-sm text-gray-500">{servicio.descripcion}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-gray-900">
            {servicio.moneda.simbolo} {formatMonto(servicio.precioBase)}{" "}
            <span className="text-xs font-normal text-gray-500">{servicio.moneda.codigo}</span>
          </span>
          <button
            type="button"
            onClick={() => (enCarrito ? quitar(servicio.id) : agregar(servicio))}
            className={
              enCarrito
                ? "rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                : "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            }
          >
            {enCarrito ? "Quitar" : "Agregar"}
          </button>
        </div>

        {servicio.asociaciones && servicio.asociaciones.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              También puedes agregar
            </p>
            <div className="flex flex-wrap gap-2">
              {servicio.asociaciones.map((a) => {
                const asoc = a.servicioAsociado;
                const yaAgregado = estaEnCarrito(asoc.id);
                return (
                  <button
                    key={asoc.id}
                    type="button"
                    onClick={() =>
                      yaAgregado
                        ? quitar(asoc.id)
                        : agregar({
                            id: asoc.id,
                            nombre: asoc.nombre,
                            descripcion: null,
                            capacidadMax: null,
                            duracionMin: asoc.duracionMin,
                            precioBase: asoc.precioBase,
                            fotoUrl: asoc.fotoUrl,
                            estadoPublicacion: "PUBLICO",
                            moneda: asoc.moneda,
                          })
                    }
                    className={
                      yaAgregado
                        ? "rounded-full border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-700"
                        : "rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
                    }
                  >
                    {yaAgregado ? "✓ " : "+ "}
                    {asoc.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
