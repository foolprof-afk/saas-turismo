"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Impuesto {
  id: string;
  nombre: string;
  porcentaje: string;
  aplicaA: "SERVICIO" | "RESERVA";
}

export default function ImpuestosPage() {
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [aplicaA, setAplicaA] = useState<"SERVICIO" | "RESERVA">("SERVICIO");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Impuesto[]>("/impuestos")
      .then(setImpuestos)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setPorcentaje("");
    setAplicaA("SERVICIO");
  };

  const editar = (i: Impuesto) => {
    setEditingId(i.id);
    setNombre(i.nombre);
    setPorcentaje(String(i.porcentaje));
    setAplicaA(i.aplicaA);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este impuesto?")) return;
    try {
      await api.delete(`/impuestos/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el impuesto");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = { nombre, porcentaje: Number(porcentaje), aplicaA };
      if (editingId) {
        await api.put(`/impuestos/${editingId}`, data);
      } else {
        await api.post("/impuestos", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el impuesto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Impuestos</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Editar impuesto" : "Nuevo impuesto"}</h2>
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
            <label className="block text-sm font-medium">Porcentaje</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Aplica a</label>
          <select
            value={aplicaA}
            onChange={(e) => setAplicaA(e.target.value as "SERVICIO" | "RESERVA")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="SERVICIO">Servicio</option>
            <option value="RESERVA">Reserva</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear impuesto"}
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
              <th className="px-4 py-2">Porcentaje</th>
              <th className="px-4 py-2">Aplica a</th>
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
            {!loading && impuestos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay impuestos todavía
                </td>
              </tr>
            )}
            {impuestos.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-2">{i.nombre}</td>
                <td className="px-4 py-2">{i.porcentaje}%</td>
                <td className="px-4 py-2">{i.aplicaA}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(i)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(i.id)} className="text-red-600 hover:underline">
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
