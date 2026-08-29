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

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    cargar();
  }, []);

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
            <label className="block text-sm font-medium">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="hotel">Hotel</option>
              <option value="transportista">Transportista</option>
              <option value="guia_freelance">Guía freelance</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
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
