"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Cliente {
  id: string;
  nombre: string;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  pais?: string | null;
  notas?: string | null;
  logoUrl?: string | null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pais, setPais] = useState("");
  const [notas, setNotas] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Cliente[]>("/clientes?limit=500")
      .then(setClientes)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setDocumento("");
    setEmail("");
    setTelefono("");
    setPais("");
    setNotas("");
    setLogoUrl(undefined);
  };

  const editar = (c: Cliente) => {
    setEditingId(c.id);
    setNombre(c.nombre);
    setDocumento(c.documento ?? "");
    setEmail(c.email ?? "");
    setTelefono(c.telefono ?? "");
    setPais(c.pais ?? "");
    setNotas(c.notas ?? "");
    setLogoUrl(c.logoUrl ?? undefined);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    try {
      await api.delete(`/clientes/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el cliente");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        nombre,
        documento: documento || undefined,
        email: email || undefined,
        telefono: telefono || undefined,
        pais: pais || undefined,
        notas: notas || undefined,
        logoUrl: logoUrl || null,
      };
      if (editingId) {
        await api.put(`/clientes/${editingId}`, data);
      } else {
        await api.post("/clientes", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Clientes</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">
          {editingId ? "Editar cliente" : "Nuevo cliente"}
        </h2>
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
            <label className="block text-sm font-medium">Documento / RUC (opcional)</label>
            <input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Correo (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <label className="block text-sm font-medium">País (opcional)</label>
            <input
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Notas (opcional)</label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Logo del cliente (opcional)</label>
          <p className="mt-1 text-xs text-gray-500">
            Si se define, se muestra en el voucher de sus reservas en vez del logo de la agencia.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setLogoUrl(file ? await fileToDataUrl(file) : undefined);
            }}
            className="mt-2 w-full text-sm"
          />
          {logoUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img src={logoUrl} alt="Logo del cliente" className="h-12 w-12 rounded border object-contain" />
              <button type="button" onClick={() => setLogoUrl(undefined)} className="text-xs text-red-600 hover:underline">
                Quitar logo
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear cliente"}
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
              <th className="px-4 py-2">Logo</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">País</th>
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
            {!loading && clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No hay clientes todavía
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.nombre} className="h-8 w-8 rounded border object-contain" />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2">{c.nombre}</td>
                <td className="px-4 py-2">{c.email ?? "-"}</td>
                <td className="px-4 py-2">{c.telefono ?? "-"}</td>
                <td className="px-4 py-2">{c.pais ?? "-"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(c)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(c.id)} className="text-red-600 hover:underline">
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
