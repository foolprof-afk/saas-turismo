"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface PasajeroSugerido {
  nombre: string;
  telefono: string | null;
}

interface BuscadorPasajeroProps {
  value: string;
  onChange: (nombre: string) => void;
  onSeleccionar: (pasajero: PasajeroSugerido) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * Campo de nombre de pasajero con autocompletado: busca en el backend (pasajeros de reservas +
 * responsables de cotizaciones anteriores) a medida que se escribe, para que si el pasajero ya
 * existe (pide más servicios en el camino) no haya que volver a teclear nombre y teléfono.
 */
export function BuscadorPasajero({
  value,
  onChange,
  onSeleccionar,
  placeholder,
  required,
  className,
}: BuscadorPasajeroProps) {
  const [sugerencias, setSugerencias] = useState<PasajeroSugerido[]>([]);
  const [open, setOpen] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  useEffect(() => {
    const texto = value.trim();
    if (texto.length < 2) {
      setSugerencias([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .get<PasajeroSugerido[]>(`/pasajeros/buscar?q=${encodeURIComponent(texto)}`)
        .then(setSugerencias)
        .catch(() => setSugerencias([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        required={required}
        value={value}
        placeholder={placeholder ?? "Nombre completo"}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        className={className ?? "w-full rounded border px-3 py-2 text-sm"}
      />
      {open && sugerencias.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow-lg">
          {sugerencias.map((s, i) => (
            <button
              type="button"
              key={`${s.nombre}-${i}`}
              onClick={() => {
                onSeleccionar(s);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span>{s.nombre}</span>
              {s.telefono && <span className="text-xs text-gray-400">{s.telefono}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
