"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Moneda {
  id: string;
  codigo: string;
  simbolo: string;
  tasaCambio: string;
  esPrincipal: boolean;
}

export default function MonedasPage() {
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [simbolo, setSimbolo] = useState("");
  const [tasaCambio, setTasaCambio] = useState("1");
  const [esPrincipal, setEsPrincipal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Moneda[]>("/monedas")
      .then(setMonedas)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setCodigo("");
    setSimbolo("");
    setTasaCambio("1");
    setEsPrincipal(false);
  };

  const editar = (m: Moneda) => {
    setEditingId(m.id);
    setCodigo(m.codigo);
    setSimbolo(m.simbolo);
    setTasaCambio(String(m.tasaCambio));
    setEsPrincipal(m.esPrincipal);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta moneda?")) return;
    try {
      await api.delete(`/monedas/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la moneda");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        codigo: codigo.toUpperCase(),
        simbolo,
        tasaCambio: Number(tasaCambio),
        esPrincipal,
      };
      if (editingId) {
        await api.put(`/monedas/${editingId}`, data);
      } else {
        await api.post("/monedas", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la moneda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Monedas</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Editar moneda" : "Nueva moneda"}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Código (ej. USD)</label>
            <input
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Símbolo (ej. $)</label>
            <input
              required
              value={simbolo}
              onChange={(e) => setSimbolo(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Tasa de cambio</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              required
              value={tasaCambio}
              onChange={(e) => setTasaCambio(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="esPrincipal"
              checked={esPrincipal}
              onChange={(e) => setEsPrincipal(e.target.checked)}
            />
            <label htmlFor="esPrincipal" className="text-sm font-medium">
              Moneda principal
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear moneda"}
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
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Símbolo</th>
              <th className="px-4 py-2">Tasa</th>
              <th className="px-4 py-2">Principal</th>
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
            {!loading && monedas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No hay monedas todavía
                </td>
              </tr>
            )}
            {monedas.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2">{m.codigo}</td>
                <td className="px-4 py-2">{m.simbolo}</td>
                <td className="px-4 py-2">{m.tasaCambio}</td>
                <td className="px-4 py-2">{m.esPrincipal ? "Sí" : "-"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(m)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(m.id)} className="text-red-600 hover:underline">
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
