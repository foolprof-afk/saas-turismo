"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Agencia {
  id: string;
  nombre: string;
  subdominio: string;
  estado: string;
  esPlataforma: boolean;
  createdAt: string;
}

export default function AgenciasPage() {
  const { usuario, loading: authLoading } = useAuth();
  const router = useRouter();

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [subdominio, setSubdominio] = useState("");
  const [adminNombre, setAdminNombre] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && usuario && !usuario.agenciaEsPlataforma) {
      router.replace("/dashboard");
    }
  }, [authLoading, usuario, router]);

  const cargar = () => {
    setLoading(true);
    api
      .get<Agencia[]>("/agencias")
      .then(setAgencias)
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (usuario?.agenciaEsPlataforma) cargar();
  }, [usuario]);

  const resetForm = () => {
    setNombre("");
    setSubdominio("");
    setAdminNombre("");
    setAdminEmail("");
    setAdminPassword("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/agencias", { nombre, subdominio, adminNombre, adminEmail, adminPassword });
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la agencia");
    } finally {
      setSaving(false);
    }
  };

  const urlDe = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/a/${slug}`;

  const copiarUrl = async (a: Agencia) => {
    try {
      await navigator.clipboard.writeText(urlDe(a.subdominio));
      setCopiedId(a.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  if (authLoading || !usuario?.agenciaEsPlataforma) {
    return <div className="text-sm text-gray-500">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Agencias</h1>
      <p className="text-sm text-gray-500">
        Crea una agencia por cada cliente. Cada una tendrá su propia URL de acceso y sus propios datos (servicios,
        clientes, reservas, etc.) completamente aislados del resto.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">Nueva agencia</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Nombre de la agencia</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Getaway Tours"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">URL / carpeta (slug)</label>
            <input
              required
              value={subdominio}
              onChange={(e) => setSubdominio(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="getaway"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
            {subdominio && <p className="mt-1 text-xs text-gray-400">{urlDe(subdominio)}</p>}
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-2 text-sm font-medium">Primer usuario administrador</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Nombre</label>
              <input
                required
                value={adminNombre}
                onChange={(e) => setAdminNombre(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Correo</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Creando..." : "Crear agencia"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">URL de acceso</th>
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
            {!loading && agencias.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay agencias todavía
                </td>
              </tr>
            )}
            {agencias.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">
                  {a.nombre}
                  {a.esPlataforma && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      Plataforma
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-600">{urlDe(a.subdominio)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      a.estado === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {a.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => copiarUrl(a)} className="text-blue-600 hover:underline">
                    {copiedId === a.id ? "Copiado" : "Copiar URL"}
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
