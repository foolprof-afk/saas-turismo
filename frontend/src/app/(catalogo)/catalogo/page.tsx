"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ServicioCatalogo } from "@/lib/catalogo/types";
import { ServicioCard } from "@/components/catalogo/servicio-card";
import { useCarrito } from "@/lib/catalogo/cart-context";
import { formatDias } from "@/lib/catalogo/dias";

// Catálogo público (Front Office) de Guatetur: lista todos los servicios PUBLICO/ACTIVO de la
// agencia (ver GET /catalogo-proxy/servicios, que llama al backend como usuario.web). No
// requiere sesión: cualquier visitante puede ver el catálogo y armar su carrito "Mi viaje".
// Nota: el proxy vive fuera de /api/ porque nginx reenvía /api/* directo al backend en
// producción (ver nota en app/catalogo-proxy/servicios/route.ts).
export default function CatalogoPage() {
  const [servicios, setServicios] = useState<ServicioCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const { items, totalDiasEstimados } = useCarrito();

  useEffect(() => {
    fetch("/catalogo-proxy/servicios")
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar el catálogo");
        return res.json();
      })
      .then((data) => setServicios(data))
      .catch(() => setError("No se pudo cargar el catálogo. Intenta de nuevo en unos minutos."))
      .finally(() => setCargando(false));
  }, []);

  const serviciosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return servicios;
    return servicios.filter(
      (s) =>
        s.nombre.toLowerCase().includes(texto) ||
        (s.descripcion ?? "").toLowerCase().includes(texto) ||
        (s.tipoServicio?.nombre ?? "").toLowerCase().includes(texto),
    );
  }, [servicios, busqueda]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de servicios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Explora los tours y servicios disponibles y agrégalos a tu viaje.
          </p>
        </div>
        {items.length > 0 && (
          <Link
            href="/catalogo/mi-viaje"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Mi viaje ({items.length}) · {formatDias(totalDiasEstimados)}
          </Link>
        )}
      </header>

      <div className="mb-6">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o tipo de servicio..."
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {cargando && <p className="text-sm text-gray-500">Cargando catálogo...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!cargando && !error && serviciosFiltrados.length === 0 && (
        <p className="text-sm text-gray-500">No hay servicios disponibles por ahora.</p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {serviciosFiltrados.map((servicio) => (
          <ServicioCard key={servicio.id} servicio={servicio} />
        ))}
      </div>
    </div>
  );
}
