"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface PuntoRecogida {
  id: string;
  nombre: string;
  direccion?: string | null;
  lat?: string | null;
  lng?: string | null;
  referencia?: string | null;
}

export default function PuntosRecogidaPage() {
  const [puntos, setPuntos] = useState<PuntoRecogida[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [referencia, setReferencia] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<PuntoRecogida[]>("/puntos-recogida?limit=500")
      .then(setPuntos)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setDireccion("");
    setLat("");
    setLng("");
    setReferencia("");
  };

  const editar = (p: PuntoRecogida) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setDireccion(p.direccion ?? "");
    setLat(p.lat ? String(p.lat) : "");
    setLng(p.lng ? String(p.lng) : "");
    setReferencia(p.referencia ?? "");
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este punto de recogida?")) return;
    try {
      await api.delete(`/puntos-recogida/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el punto de recogida");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        nombre,
        direccion: direccion || undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        referencia: referencia || undefined,
      };
      if (editingId) {
        await api.put(`/puntos-recogida/${editingId}`, data);
      } else {
        await api.post("/puntos-recogida", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el punto de recogida");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Puntos de recogida</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">
          {editingId ? "Editar punto de recogida" : "Nuevo punto de recogida"}
        </h2>
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
          <label className="block text-sm font-medium">Dirección (opcional)</label>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Latitud (opcional)</label>
            <input
              type="number"
              step="0.0000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Longitud (opcional)</label>
            <input
              type="number"
              step="0.0000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Referencia (opcional)</label>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear punto de recogida"}
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
              <th className="px-4 py-2">Dirección</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && puntos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No hay puntos de recogida todavía
                </td>
              </tr>
            )}
            {puntos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.nombre}</td>
                <td className="px-4 py-2">{p.direccion ?? "-"}</td>
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
