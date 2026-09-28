"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface PasarelaPago {
  id: string;
  proveedor: string;
  nombre: string;
  activo: boolean;
  urlBase?: string | null;
  config: Record<string, string | undefined>;
}

interface ProveedorDisponible {
  id: string;
  camposConfigRequeridos: string[];
  monedasSoportadas: string[];
}

// Ayuda visible junto a cada campo de config, por proveedor. Si en el futuro se agrega otro
// proveedor con más campos, basta con sumar sus etiquetas aquí (el resto del formulario ya es
// genérico gracias a camposConfigRequeridos que devuelve el backend).
const ETIQUETAS_CAMPO: Record<string, string> = {
  secretKey: "Secret key (X-SECRET-KEY)",
  webhookSecret: "Webhook secret (whsec_...)",
};

export default function PasarelasPagoPage() {
  const [pasarelas, setPasarelas] = useState<PasarelaPago[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDisponible[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [proveedor, setProveedor] = useState("");
  const [nombre, setNombre] = useState("");
  const [urlBase, setUrlBase] = useState("");
  const [activo, setActivo] = useState(true);
  const [config, setConfig] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const proveedorInfo = proveedores.find((p) => p.id === proveedor);

  const cargar = () => {
    setLoading(true);
    api
      .get<PasarelaPago[]>("/pasarelas-pago")
      .then(setPasarelas)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get<ProveedorDisponible[]>("/pasarelas-pago/proveedores").then(setProveedores).catch(() => setProveedores([]));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setProveedor("");
    setNombre("");
    setUrlBase("");
    setActivo(true);
    setConfig({});
  };

  const editar = (p: PasarelaPago) => {
    setEditingId(p.id);
    setProveedor(p.proveedor);
    setNombre(p.nombre);
    setUrlBase(p.urlBase ?? "");
    setActivo(p.activo);
    setConfig({});
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta pasarela de pago?")) return;
    try {
      await api.delete(`/pasarelas-pago/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la pasarela de pago");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = { proveedor, nombre, urlBase: urlBase || undefined, activo, config };
      if (editingId) {
        await api.put(`/pasarelas-pago/${editingId}`, data);
      } else {
        await api.post("/pasarelas-pago", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la pasarela de pago");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Pasarelas de pago</h1>
      <p className="text-sm text-gray-500">
        Configura las credenciales de proveedores como Recurrente para poder generar links de pago
        desde una reserva.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">
          {editingId ? "Editar pasarela de pago" : "Nueva pasarela de pago"}
        </h2>

        <div>
          <label className="block text-sm font-medium">Proveedor</label>
          <select
            required
            disabled={!!editingId}
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">Selecciona un proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}
              </option>
            ))}
          </select>
          {proveedorInfo && (
            <p className="mt-1 text-xs text-gray-400">
              Monedas admitidas: {proveedorInfo.monedasSoportadas.join(", ")}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Recurrente producción"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">URL base de la API (opcional)</label>
          <input
            value={urlBase}
            onChange={(e) => setUrlBase(e.target.value)}
            placeholder="https://app.recurrente.com/api"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activa
        </label>

        {proveedorInfo && (
          <div className="space-y-3 border-t pt-3">
            {proveedorInfo.camposConfigRequeridos.map((campo) => (
              <div key={campo}>
                <label className="block text-sm font-medium">{ETIQUETAS_CAMPO[campo] ?? campo}</label>
                <input
                  type="password"
                  value={config[campo] ?? ""}
                  onChange={(e) => setConfig({ ...config, [campo]: e.target.value })}
                  placeholder={editingId ? "Dejar en blanco para no cambiar" : ""}
                  required={!editingId}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono"
                />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear pasarela"}
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
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Proveedor</th>
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
            {!loading && pasarelas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay pasarelas de pago configuradas todavía
                </td>
              </tr>
            )}
            {pasarelas.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.nombre}</td>
                <td className="px-4 py-2">{p.proveedor}</td>
                <td className="px-4 py-2">{p.activo ? "Activa" : "Inactiva"}</td>
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
