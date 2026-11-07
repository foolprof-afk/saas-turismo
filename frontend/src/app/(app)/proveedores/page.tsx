"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Proveedor {
  id: string;
  nombre: string;
  tipo: string;
  contacto?: string | null;
  condicionesPago?: string | null;
  cuentaBancaria?: string | null;
  estado: string;
}

interface TipoProveedor {
  id: string;
  nombre: string;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipos, setTipos] = useState<TipoProveedor[]>([]);
  const [gestionTiposAbierta, setGestionTiposAbierta] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [tiposError, setTiposError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("hotel");
  const [contacto, setContacto] = useState("");
  const [condicionesPago, setCondicionesPago] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");
  const [estado, setEstado] = useState("ACTIVO");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Proveedor[]>("/proveedores?limit=500")
      .then(setProveedores)
      .finally(() => setLoading(false));
  };

  // Catálogo editable de tipos de proveedor (ver TiposProveedorService): alimenta el selector
  // de abajo y se puede ampliar desde "Gestionar tipos" sin tocar código.
  const cargarTipos = () => {
    api.get<TipoProveedor[]>("/tipos-proveedor").then(setTipos);
  };

  useEffect(() => {
    cargar();
    cargarTipos();
  }, []);

  const crearTipo = async (e: FormEvent) => {
    e.preventDefault();
    setTiposError(null);
    const nombreLimpio = nuevoTipo.trim();
    if (!nombreLimpio) return;
    try {
      await api.post("/tipos-proveedor", { nombre: nombreLimpio });
      setNuevoTipo("");
      cargarTipos();
    } catch (err) {
      setTiposError(err instanceof ApiError ? err.message : "No se pudo crear el tipo");
    }
  };

  const eliminarTipo = async (id: string) => {
    if (!confirm("¿Eliminar este tipo de proveedor?")) return;
    try {
      await api.delete(`/tipos-proveedor/${id}`);
      cargarTipos();
    } catch (err) {
      setTiposError(err instanceof ApiError ? err.message : "No se pudo eliminar el tipo");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setTipo("hotel");
    setContacto("");
    setCondicionesPago("");
    setCuentaBancaria("");
    setEstado("ACTIVO");
  };

  const editar = (p: Proveedor) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setTipo(p.tipo);
    setContacto(p.contacto ?? "");
    setCondicionesPago(p.condicionesPago ?? "");
    setCuentaBancaria(p.cuentaBancaria ?? "");
    setEstado(p.estado);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try {
      await api.delete(`/proveedores/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el proveedor");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        nombre,
        tipo,
        contacto: contacto || undefined,
        condicionesPago: condicionesPago || undefined,
        cuentaBancaria: cuentaBancaria || undefined,
        estado,
      };
      if (editingId) {
        await api.put(`/proveedores/${editingId}`, data);
      } else {
        await api.post("/proveedores", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el proveedor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Proveedores</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Editar proveedor" : "Nuevo proveedor"}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Tipo</label>
              <button
                type="button"
                onClick={() => setGestionTiposAbierta((v) => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                Gestionar tipos
              </button>
            </div>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              {/* Si el tipo actual (al editar) ya no está en el catálogo, se incluye igual para no perderlo */}
              {!tipos.some((t) => t.nombre === tipo) && tipo && <option value={tipo}>{tipo}</option>}
              {tipos.map((t) => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>

            {gestionTiposAbierta && (
              <div className="mt-2 space-y-2 rounded border bg-gray-50 p-3">
                <form onSubmit={crearTipo} className="flex gap-2">
                  <input
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    placeholder="Nuevo tipo, ej. operador"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white">
                    Agregar
                  </button>
                </form>
                {tiposError && <p className="text-xs text-red-600">{tiposError}</p>}
                <ul className="space-y-1">
                  {tipos.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-xs text-gray-700">
                      <span>{t.nombre}</span>
                      <button type="button" onClick={() => eliminarTipo(t.id)} className="text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Contacto (opcional)</label>
            <input
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Condiciones de pago (opcional)</label>
            <input
              value={condicionesPago}
              onChange={(e) => setCondicionesPago(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Cuenta bancaria (opcional)</label>
            <input
              value={cuentaBancaria}
              onChange={(e) => setCuentaBancaria(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear proveedor"}
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

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Contacto</th>
              <th className="px-4 py-2">Estado</th>
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
            {!loading && proveedores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No hay proveedores todavía
                </td>
              </tr>
            )}
            {proveedores.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.nombre}</td>
                <td className="px-4 py-2">{p.tipo}</td>
                <td className="px-4 py-2">{p.contacto ?? "-"}</td>
                <td className="px-4 py-2">{p.estado}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(p)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(p.id)} className="text-red-600 hover:underline">
                    Eliminar
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
