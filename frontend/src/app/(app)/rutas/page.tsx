"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Ruta {
  id: string;
  nombre: string;
  origen: string;
  destino: string;
  duracionEstimadaMin?: number | null;
  distanciaKm?: string | null;
}

export default function RutasPage() {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [duracionEstimadaMin, setDuracionEstimadaMin] = useState("");
  const [distanciaKm, setDistanciaKm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Ruta[]>("/rutas")
      .then(setRutas)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setOrigen("");
    setDestino("");
    setDuracionEstimadaMin("");
    setDistanciaKm("");
  };

  const editar = (r: Ruta) => {
    setEditingId(r.id);
    setNombre(r.nombre);
    setOrigen(r.origen);
    setDestino(r.destino);
    setDuracionEstimadaMin(r.duracionEstimadaMin ? String(r.duracionEstimadaMin) : "");
    setDistanciaKm(r.distanciaKm ? String(r.distanciaKm) : "");
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta ruta?")) return;
    try {
      await api.delete(`/rutas/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la ruta");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        nombre,
        origen,
        destino,
        duracionEstimadaMin: duracionEstimadaMin ? Number(duracionEstimadaMin) : undefined,
        distanciaKm: distanciaKm ? Number(distanciaKm) : undefined,
      };
      if (editingId) {
        await api.put(`/rutas/${editingId}`, data);
      } else {
        await api.post("/rutas", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la ruta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Rutas</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Editar ruta" : "Nueva ruta"}</h2>
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Origen</label>
            <input
              required
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Destino</label>
            <input
              required
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Duración estimada (min, opcional)</label>
            <input
              type="number"
              min="0"
              value={duracionEstimadaMin}
              onChange={(e) => setDuracionEstimadaMin(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Distancia (km, opcional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={distanciaKm}
              onChange={(e) => setDistanciaKm(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear ruta"}
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
              <th className="px-4 py-2">Origen</th>
              <th className="px-4 py-2">Destino</th>
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
            {!loading && rutas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay rutas todavía
                </td>
              </tr>
            )}
            {rutas.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.nombre}</td>
                <td className="px-4 py-2">{r.origen}</td>
                <td className="px-4 py-2">{r.destino}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(r)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(r.id)} className="text-red-600 hover:underline">
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
