"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Opcion {
  id: string;
  nombre: string;
}

interface Guia {
  id: string;
  proveedorId?: string | null;
  nombre: string;
  idiomas: string[];
  licencia?: string | null;
  telefono?: string | null;
  estado: string;
}

export default function GuiasPage() {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [proveedores, setProveedores] = useState<Opcion[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState("");
  const [nombre, setNombre] = useState("");
  const [idiomas, setIdiomas] = useState("");
  const [licencia, setLicencia] = useState("");
  const [telefono, setTelefono] = useState("");
  const [estado, setEstado] = useState("ACTIVO");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Guia[]>("/guias")
      .then(setGuias)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get<Opcion[]>("/proveedores").then(setProveedores).catch(() => null);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setProveedorId("");
    setNombre("");
    setIdiomas("");
    setLicencia("");
    setTelefono("");
    setEstado("ACTIVO");
  };

  const editar = (g: Guia) => {
    setEditingId(g.id);
    setProveedorId(g.proveedorId ?? "");
    setNombre(g.nombre);
    setIdiomas((g.idiomas ?? []).join(", "));
    setLicencia(g.licencia ?? "");
    setTelefono(g.telefono ?? "");
    setEstado(g.estado);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este guía?")) return;
    try {
      await api.delete(`/guias/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el guía");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        proveedorId: proveedorId || undefined,
        nombre,
        idiomas: idiomas
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        licencia: licencia || undefined,
        telefono: telefono || undefined,
        estado,
      };
      if (editingId) {
        await api.put(`/guias/${editingId}`, data);
      } else {
        await api.post("/guias", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el guía");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Guías</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Editar guía" : "Nuevo guía"}</h2>
        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium">Teléfono (opcional)</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Idiomas (separados por coma)</label>
            <input
              placeholder="Español, Inglés"
              value={idiomas}
              onChange={(e) => setIdiomas(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Licencia (opcional)</label>
            <input
              value={licencia}
              onChange={(e) => setLicencia(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Proveedor (opcional)</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
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
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear guía"}
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

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Idiomas</th>
              <th className="px-4 py-2">Teléfono</th>
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
            {!loading && guias.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No hay guías todavía
                </td>
              </tr>
            )}
            {guias.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-4 py-2">{g.nombre}</td>
                <td className="px-4 py-2">{(g.idiomas ?? []).join(", ") || "-"}</td>
                <td className="px-4 py-2">{g.telefono ?? "-"}</td>
                <td className="px-4 py-2">{g.estado}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(g)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(g.id)} className="text-red-600 hover:underline">
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
