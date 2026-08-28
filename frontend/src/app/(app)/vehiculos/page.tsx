"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Opcion {
  id: string;
  nombre: string;
}

interface Vehiculo {
  id: string;
  proveedorId?: string | null;
  patente: string;
  tipo: string;
  capacidad: number;
  estado: string;
  proveedor?: { nombre: string } | null;
}

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [proveedores, setProveedores] = useState<Opcion[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState("");
  const [patente, setPatente] = useState("");
  const [tipo, setTipo] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [estado, setEstado] = useState("ACTIVO");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Vehiculo[]>("/vehiculos?limit=500")
      .then(setVehiculos)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get<Opcion[]>("/proveedores").then(setProveedores).catch(() => null);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setProveedorId("");
    setPatente("");
    setTipo("");
    setCapacidad("");
    setEstado("ACTIVO");
  };

  const editar = (v: Vehiculo) => {
    setEditingId(v.id);
    setProveedorId(v.proveedorId ?? "");
    setPatente(v.patente);
    setTipo(v.tipo);
    setCapacidad(String(v.capacidad));
    setEstado(v.estado);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este vehículo?")) return;
    try {
      await api.delete(`/vehiculos/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el vehículo");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        proveedorId: proveedorId || undefined,
        patente,
        tipo,
        capacidad: Number(capacidad),
        estado,
      };
      if (editingId) {
        await api.put(`/vehiculos/${editingId}`, data);
      } else {
        await api.post("/vehiculos", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el vehículo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Vehículos</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Editar vehículo" : "Nuevo vehículo"}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Placa/Patente</label>
            <input
              required
              value={patente}
              onChange={(e) => setPatente(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tipo</label>
            <input
              required
              placeholder="Ej. Bus, Van, Sedan"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Capacidad</label>
            <input
              type="number"
              min="1"
              required
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear vehículo"}
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
              <th className="px-4 py-2">Placa</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Capacidad</th>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && vehiculos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No hay vehículos todavía
                </td>
              </tr>
            )}
            {vehiculos.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-2">{v.patente}</td>
                <td className="px-4 py-2">{v.tipo}</td>
                <td className="px-4 py-2">{v.capacidad}</td>
                <td className="px-4 py-2">
                  {proveedores.find((p) => p.id === v.proveedorId)?.nombre ?? "-"}
                </td>
                <td className="px-4 py-2">{v.estado}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(v)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(v.id)} className="text-red-600 hover:underline">
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
