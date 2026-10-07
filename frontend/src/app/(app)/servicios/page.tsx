"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMonto } from "@/lib/moneda";

interface Opcion {
  id: string;
  nombre: string;
}
interface Moneda {
  id: string;
  codigo: string;
}

interface ServicioAsociacion {
  servicioAsociado: { id: string; nombre: string };
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
  precioCosto?: string | null;
  monedaId: string;
  rutaId?: string | null;
  puntoRecogidaId?: string | null;
  estado: string;
  palabrasClave?: string[];
  fotoUrl?: string | null;
  estadoPublicacion?: "PUBLICO" | "PRIVADO";
  asociaciones?: ServicioAsociacion[];
}

export default function ServiciosPage() {
  const { usuario } = useAuth();
  const verCostos = usuario?.rol === "admin";
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
  const [precioCosto, setPrecioCosto] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [puntoRecogidaId, setPuntoRecogidaId] = useState("");
  const [palabrasClaveInput, setPalabrasClaveInput] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [estadoPublicacion, setEstadoPublicacion] = useState<"PUBLICO" | "PRIVADO">("PRIVADO");
  const [asociadoIds, setAsociadoIds] = useState<string[]>([]);
  const [buscarAsociado, setBuscarAsociado] = useState("");

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
    setPrecioCosto("");
    setMonedaId("");
    setRutaId("");
    setPuntoRecogidaId("");
    setPalabrasClaveInput("");
    setFotoUrl("");
    setEstadoPublicacion("PRIVADO");
    setAsociadoIds([]);
    setBuscarAsociado("");
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
    setPrecioCosto(s.precioCosto ? String(s.precioCosto) : "");
    setMonedaId(s.monedaId);
    setRutaId(s.rutaId ?? "");
    setPuntoRecogidaId(s.puntoRecogidaId ?? "");
    setPalabrasClaveInput((s.palabrasClave ?? []).map((p) => `#${p}`).join(" "));
    setFotoUrl(s.fotoUrl ?? "");
    setEstadoPublicacion(s.estadoPublicacion ?? "PRIVADO");
    setAsociadoIds((s.asociaciones ?? []).map((a) => a.servicioAsociado.id));
    setBuscarAsociado("");
  };

  // Precarga el formulario con los datos del servicio seleccionado, pero sin editingId, para
  // que al guardar se cree un servicio nuevo (POST) en vez de modificar el original.
  const duplicar = (s: Servicio) => {
    setEditingId(null);
    setProveedorId(s.proveedorId);
    setTipoServicioId(s.tipoServicioId);
    setNombre(`${s.nombre} copia 1`);
    setDescripcion(s.descripcion ?? "");
    setCapacidadMax(s.capacidadMax ? String(s.capacidadMax) : "");
    setDuracionMin(s.duracionMin ? String(s.duracionMin) : "");
    setPrecioBase(String(s.precioBase));
    setPrecioCosto(s.precioCosto ? String(s.precioCosto) : "");
    setMonedaId(s.monedaId);
    setRutaId(s.rutaId ?? "");
    setPuntoRecogidaId(s.puntoRecogidaId ?? "");
    setPalabrasClaveInput((s.palabrasClave ?? []).map((p) => `#${p}`).join(" "));
    setFotoUrl("");
    setEstadoPublicacion("PRIVADO");
    setAsociadoIds([]);
    setBuscarAsociado("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        precioCosto: precioCosto ? Number(precioCosto) : undefined,
        monedaId,
        rutaId: rutaId || undefined,
        puntoRecogidaId: puntoRecogidaId || undefined,
        palabrasClave: parsearPalabrasClave(palabrasClaveInput),
        fotoUrl: fotoUrl || undefined,
        estadoPublicacion,
        asociadoIds,
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
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            placeholder="Escribe aquí todos los detalles del servicio: horarios, qué incluye, recomendaciones, etc. Esta información la vera el cliente en su voucher."
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">
            Este texto se muestra al cliente en el visualizador del voucher, dentro del detalle de cada servicio.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        {verCostos && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <label className="block text-sm font-medium">Precio costo (opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precioCosto}
                onChange={(e) => setPrecioCosto(e.target.value)}
                placeholder="Lo que se paga al proveedor"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">Se usa como valor por defecto al generar una orden de servicio.</p>
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
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Foto (URL, opcional)</label>
            <input
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Foto principal para el catálogo público (Front Office).</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Publicación en catálogo web</label>
            <select
              value={estadoPublicacion}
              onChange={(e) => setEstadoPublicacion(e.target.value as "PUBLICO" | "PRIVADO")}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="PRIVADO">Privado (no visible en el catálogo web)</option>
              <option value="PUBLICO">Público (visible en el catálogo web)</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Independiente del estado activo/inactivo: un servicio puede estar activo pero aún
              privado mientras se prepara su publicación.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Servicios asociados (opcional)</label>
          <p className="mt-1 text-xs text-gray-400">
            Se mostrarán como sugerencia (&quot;También puedes agregar&quot;) junto a este servicio en el
            catálogo web. Selecciona uno o más de la lista.
          </p>
          <input
            value={buscarAsociado}
            onChange={(e) => setBuscarAsociado(e.target.value)}
            placeholder="Buscar servicio..."
            className="mt-2 w-full rounded border px-3 py-2 text-sm"
          />
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded border p-2">
            {servicios
              .filter((s) => s.id !== editingId)
              .filter((s) => s.nombre.toLowerCase().includes(buscarAsociado.trim().toLowerCase()))
              .map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={asociadoIds.includes(s.id)}
                    onChange={(e) =>
                      setAsociadoIds((prev) =>
                        e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                      )
                    }
                  />
                  {s.nombre}
                </label>
              ))}
            {servicios.filter((s) => s.id !== editingId).length === 0 && (
              <p className="text-xs text-gray-400">No hay otros servicios creados todavía.</p>
            )}
          </div>
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

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Catálogo web</th>
              {verCostos && <th className="px-4 py-2">Precio</th>}
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={verCostos ? 6 : 5} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && serviciosFiltrados.length === 0 && (
              <tr>
                <td colSpan={verCostos ? 6 : 5} className="px-4 py-6 text-center text-gray-400">
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
                <td className="px-4 py-2">
                  <span
                    className={
                      "rounded px-2 py-0.5 text-xs font-medium " +
                      (s.estadoPublicacion === "PUBLICO"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600")
                    }
                  >
                    {s.estadoPublicacion === "PUBLICO" ? "Público" : "Privado"}
                  </span>
                </td>
                {verCostos && <td className="px-4 py-2">{formatMonto(s.precioBase)}</td>}
                <td className="px-4 py-2 text-right space-x-3">
                  <button onClick={() => editar(s)} className="text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => duplicar(s)} className="text-gray-600 hover:underline">
                    Duplicar
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
