"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface ListaPrecio {
  id: string;
  nombre: string;
  porcentajeAdicional: string;
  estado: "ACTIVO" | "INACTIVO";
}

export default function ListasPrecioPage() {
  const [listas, setListas] = useState<ListaPrecio[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [porcentajeAdicional, setPorcentajeAdicional] = useState("");
  const [estado, setEstado] = useState<"ACTIVO" | "INACTIVO">("ACTIVO");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<ListaPrecio[]>("/listas-precio?limit=500")
      .then(setListas)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setPorcentajeAdicional("");
    setEstado("ACTIVO");
  };

  const editar = (l: ListaPrecio) => {
    setEditingId(l.id);
    setNombre(l.nombre);
    setPorcentajeAdicional(String(l.porcentajeAdicional));
    setEstado(l.estado);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta lista de precio?")) return;
    try {
      await api.delete(`/listas-precio/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la lista de precio");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = { nombre, porcentajeAdicional: Number(porcentajeAdicional), estado };
      if (editingId) {
        await api.put(`/listas-precio/${editingId}`, data);
      } else {
        await api.post("/listas-precio", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la lista de precio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Listas de precio</h1>
      <p className="text-sm text-gray-500">
        Porcentaje adicional sobre el precio base de los servicios, usado al crear cotizaciones y
        reservas. Cada usuario solo puede usar las listas que se le asignen en su mantenedor de
        usuarios.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">
          {editingId ? "Editar lista de precio" : "Nueva lista de precio"}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Precio mayorista"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Porcentaje adicional</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={porcentajeAdicional}
              onChange={(e) => setPorcentajeAdicional(e.target.value)}
              placeholder="Ej: 10"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as "ACTIVO" | "INACTIVO")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear lista de precio"}
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
              <th className="px-4 py-2">% adicional</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && listas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay listas de precio todavía
                </td>
              </tr>
            )}
            {listas.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2">{l.nombre}</td>
                <td className="px-4 py-2">{l.porcentajeAdicional}%</td>
                <td className="px-4 py-2">{l.estado}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(l)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(l.id)} className="text-red-600 hover:underline">
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
