"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Agencia {
  id: string;
  nombre: string;
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

export default function AgenciaPage() {
  const { usuario } = useAuth();
  const [agencia, setAgencia] = useState<Agencia | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    api
      .get<Agencia>(`/agencias/${usuario.agenciaId}`)
      .then((a) => {
        setAgencia(a);
        setLogoUrl(a.logoUrl ?? undefined);
      })
      .finally(() => setLoading(false));
  }, [usuario]);

  const guardar = async () => {
    if (!usuario) return;
    setSaving(true);
    setError(null);
    setGuardado(false);
    try {
      await api.put(`/agencias/${usuario.agenciaId}`, { logoUrl: logoUrl || null });
      setGuardado(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el logo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Mi agencia</h1>

      <div className="space-y-4 rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">{agencia?.nombre}</p>

        <div>
          <label className="block text-sm font-medium">Logo de la empresa (opcional)</label>
          <p className="mt-1 text-xs text-gray-500">
            Se muestra en el voucher de las reservas, salvo que el cliente tenga su propio logo configurado.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setLogoUrl(file ? await fileToDataUrl(file) : undefined);
              setGuardado(false);
            }}
            className="mt-2 w-full text-sm"
          />
          {logoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <img src={logoUrl} alt="Logo de la agencia" className="h-16 w-16 rounded border object-contain" />
              <button
                type="button"
                onClick={() => {
                  setLogoUrl(undefined);
                  setGuardado(false);
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Quitar logo
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {guardado && <p className="text-sm text-emerald-600">Logo guardado.</p>}

        <button
          onClick={guardar}
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
