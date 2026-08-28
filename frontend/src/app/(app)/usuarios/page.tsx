"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Rol {
  id: string;
  nombre: string;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  estado: string;
  rol: Rol;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [telefono, setTelefono] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Usuario[]>("/usuarios")
      .then(setUsuarios)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get<Rol[]>("/roles").then(setRoles).catch(() => null);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/usuarios", {
        nombre,
        email,
        password,
        rolId,
        telefono: telefono || undefined,
      });
      setNombre("");
      setEmail("");
      setPassword("");
      setRolId("");
      setTelefono("");
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">Nuevo usuario</h2>
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
            <label className="block text-sm font-medium">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Rol</label>
            <select
              required
              value={rolId}
              onChange={(e) => setRolId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Teléfono (opcional)</label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Creando..." : "Crear usuario"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Estado</th>
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
            {!loading && usuarios.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay usuarios todavía
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.nombre}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.rol?.nombre}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{u.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
