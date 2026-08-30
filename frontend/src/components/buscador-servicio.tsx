"use client";

import { useEffect, useRef, useState } from "react";

interface ServicioOpcion {
  id: string;
  nombre: string;
  precioBase: string;
}

interface BuscadorServicioProps {
  servicios: ServicioOpcion[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  required?: boolean;
}

/**
 * Selector de servicio "escrito": en vez de un <select> con decenas de opciones (una agencia
 * puede tener 50-100 servicios), el vendedor escribe parte del nombre y elige de una lista
 * filtrada. Sin librerías externas para mantener el bundle liviano.
 */
export function BuscadorServicio({ servicios, value, onChange, className, required }: BuscadorServicioProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const seleccionado = servicios.find((s) => s.id === value);
    setQuery(seleccionado ? `${seleccionado.nombre} — ${seleccionado.precioBase}` : "");
  }, [value, servicios]);

  useEffect(() => {
    const onClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const filtrados = servicios
    .filter((s) => s.nombre.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30);

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        required={required}
        value={query}
        placeholder="Escribe para buscar un servicio..."
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        className={className ?? "w-full rounded border px-3 py-2 text-sm"}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow-lg">
          {filtrados.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>}
          {filtrados.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                onChange(s.id);
                setQuery(`${s.nombre} — ${s.precioBase}`);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              {s.nombre} <span className="text-gray-400">— {s.precioBase}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
