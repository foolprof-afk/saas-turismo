"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Opcion {
  id: string;
  nombre: string;
}
interface Moneda {
  id: string;
  codigo: string;
}

interface Servicio {
  id: string;
  proveedorId: string;
  tipoServicioId: string;
  nombre: string;
  descripcion?: string | null;
  capacidadMax?: number | null;
  duracionMin?: number | null;
  precioBase: string;
  monedaId: string;
  rutaId?: string | null;
  puntoRecogidaId?: string | null;
  estado: string;
  palabrasClave?: string[];
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [proveedores, setProveedores] = useState<Opcion[]>([]);
  const [tiposServicio, setTiposServicio] = useState<Opcion[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [rutas, setRutas] = useState<Opcion[]>([]);
  const [puntosRecogida, setPuntosRecogida] = useState<Opcion[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState("");
  const [tipoServicioId, setTipoServicioId] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [capacidadMax, setCapacidadMax] = useState("");
  const [duracionMin, setDuracionMin] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [puntoRecogidaId, setPuntoRecogidaId] = useState("");
  const [palabrasClaveInput, setPalabrasClaveInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const cargar = () => {
    setLoading(true);
    api
      .get<Servicio[]>("/servicios?limit=500")
      .then(setServicios)
      .finally(() => setLoading(false));
  };

  const parsearPalabrasClave = (texto: string): string[] =>
    Array.from(
      new Set(
        texto
          .split(/[\s,]+/)
          .map((p) => p.replace(/^#/, "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );

  const busquedaNorm = busqueda.trim().toLowerCase().replace(/^#/, "");
  const serviciosFiltrados = servicios.filter(
    (s) =>
      s.nombre.toLowerCase().includes(busquedaNorm) ||
      (s.palabrasClave ?? []).some((p) => p.includes(busquedaNorm)),
  );

  useEffect(() => {
    cargar();
    api.get<Opcion[]>("/proveedores").then(setProveedores).catch(() => null);
    api.get<Opcion[]>("/tipos-servicio").then(setTiposServicio).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
    api.get<Opcion[]>("/rutas").then(setRutas).catch(() => null);
    api.get<Opcion[]>("/puntos-recogida").then(setPuntosRecogida).catch(() => null);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setProveedorId("");
    setTipoServicioId("");
    setNombre("");
    setDescripcion("");
    setCapacidadMax("");
    setDuracionMin("");
    setPrecioBase("");
    setMonedaId("");
    setRutaId("");
    setPuntoRecogidaId("");
    setPalabrasClaveInput("");
  };

  const editar = (s: Servicio) => {
    setEditingId(s.id);
    setProveedorId(s.proveedorId);
    setTipoServicioId(s.tipoServicioId);
    setNombre(s.nombre);
    setDescripcion(s.descripcion ?? "");
    setCapacidadMax(s.capacidadMax ? String(s.capacidadMax) : "");
    setDuracionMin(s.duracionMin ? String(s.duracionMin) : "");
    setPrecioBase(String(s.precioBase));
    setMonedaId(s.monedaId);
    setRutaId(s.rutaId ?? "");
    setPuntoRecogidaId(s.puntoRecogidaId ?? "");
    setPalabrasClaveInput((s.palabrasClave ?? []).map((p) => `#${p}`).join(" "));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        proveedorId,
        tipoServicioId,
        nombre,
        descripcion: descripcion || undefined,
        capacidadMax: capacidadMax ? Number(capacidadMax) : undefined,
        duracionMin: duracionMin ? Number(duracionMin) : undefined,
        precioBase: Number(precioBase),
        monedaId,
        rutaId: rutaId || undefined,
        puntoRecogidaId: puntoRecogidaId || undefined,
        palabrasClave: parsearPalabrasClave(palabrasClaveInput),
      };
      if (editingId) {
        await api.put(`/servicios/${editingId}`, data);
      } else {
        await api.post("/servicios", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el servicio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Servicios</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Editar servicio" : "Nuevo servicio"}</h2>

        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Descripción (opcional)</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Proveedor</label>
            <select
              required
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Tipo de servicio</label>
            <select
              required
              value={tipoServicioId}
              onChange={(e) => setTipoServicioId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {tiposServicio.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Precio base</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={precioBase}
              onChange={(e) => setPrecioBase(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Moneda</label>
            <select
              required
              value={monedaId}
              onChange={(e) => setMonedaId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {monedas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Capacidad máxima (opcional)</label>
            <input
              type="number"
              min="1"
              value={capacidadMax}
              onChange={(e) => setCapacidadMax(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Duración (min, opcional)</label>
            <input
              type="number"
              min="1"
              value={duracionMin}
              onChange={(e) => setDuracionMin(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Ruta (opcional)</label>
            <select
              value={rutaId}
              onChange={(e) => setRutaId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Sin ruta</option>
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Punto de recogida (opcional)</label>
            <select
              value={puntoRecogidaId}
              onChange={(e) => setPuntoRecogidaId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Sin punto de recogida</option>
              {puntosRecogida.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Palabras clave (opcional)</label>
          <input
            value={palabrasClaveInput}
            onChange={(e) => setPalabrasClaveInput(e.target.value)}
            placeholder="#playa #familiar #economico"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">
            Escribe una o más palabras separadas por espacio, con # o sin él. Ayudan a los
            vendedores a encontrar este servicio al buscarlo cuando hay muchos creados.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear servicio"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar servicio por nombre o #palabra-clave..."
          className="w-full max-w-sm rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Precio</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && serviciosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  {servicios.length === 0 ? "No hay servicios todavía" : "Sin resultados para la búsqueda"}
                </td>
              </tr>
            )}
            {serviciosFiltrados.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-2">
                  {s.nombre}
                  {s.palabrasClave && s.palabrasClave.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {s.palabrasClave.map((p) => `#${p}`).join(" ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2">{proveedores.find((p) => p.id === s.proveedorId)?.nombre ?? "-"}</td>
                <td className="px-4 py-2">{tiposServicio.find((t) => t.id === s.tipoServicioId)?.nombre ?? "-"}</td>
                <td className="px-4 py-2">{s.precioBase}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(s)} className="text-blue-600 hover:underline">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
