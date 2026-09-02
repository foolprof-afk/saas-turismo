"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

interface Log {
  id: string;
  accion: string;
  modulo: string;
  entidadId?: string | null;
  descripcion?: string | null;
  usuarioEmail?: string | null;
  createdAt: string;
  usuario?: { nombre: string; email: string } | null;
}

const ACCIONES = ["LOGIN", "ACCESO", "CREAR", "MODIFICAR", "ELIMINAR"];
const LIMIT = 50;

const ACCION_LABEL: Record<string, string> = {
  LOGIN: "Ingreso al sistema",
  ACCESO: "Acceso por menú",
  CREAR: "Creación",
  MODIFICAR: "Modificación",
  ELIMINAR: "Eliminación",
};

const ACCION_COLOR: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  ACCESO: "bg-gray-100 text-gray-700",
  CREAR: "bg-emerald-100 text-emerald-700",
  MODIFICAR: "bg-amber-100 text-amber-700",
  ELIMINAR: "bg-red-100 text-red-700",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [usuarioId, setUsuarioId] = useState("");
  const [accion, setAccion] = useState("");
  const [modulo, setModulo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    api
      .get<{ items: Usuario[] } | Usuario[]>("/usuarios?limit=500")
      .then((res) => setUsuarios(Array.isArray(res) ? res : res.items))
      .catch(() => setUsuarios([]));
  }, []);

  const cargar = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (usuarioId) params.set("usuarioId", usuarioId);
    if (accion) params.set("accion", accion);
    if (modulo) params.set("modulo", modulo);
    if (fechaInicio) params.set("fechaInicio", fechaInicio);
    if (fechaFin) params.set("fechaFin", fechaFin);

    api
      .get<{ items: Log[]; total: number }>(`/logs?${params.toString()}`)
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const aplicarFiltros = () => {
    if (page !== 1) setPage(1);
    else cargar();
  };

  const totalPaginas = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Logs del sistema</h1>
        <p className="text-sm text-gray-500">
          Registro de auditoría: ingresos, accesos por menú, creaciones, modificaciones y eliminaciones.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-5 md:grid-cols-5">
        <div>
          <label className="block text-sm font-medium">Usuario</label>
          <select
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Acción</label>
          <select
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>
                {ACCION_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Pantalla</label>
          <input
            value={modulo}
            onChange={(e) => setModulo(e.target.value)}
            placeholder="ej. clientes"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2 md:col-span-5">
          <button
            onClick={aplicarFiltros}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Filtrar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Fecha y hora</th>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Acción</th>
              <th className="px-4 py-2">Pantalla</th>
              <th className="px-4 py-2">Registro</th>
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
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No hay registros para los filtros seleccionados
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">{l.usuario?.nombre ?? l.usuarioEmail ?? "-"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${ACCION_COLOR[l.accion] ?? "bg-gray-100"}`}>
                    {ACCION_LABEL[l.accion] ?? l.accion}
                  </span>
                </td>
                <td className="px-4 py-2">{l.modulo}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{l.entidadId ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-500">
            Página {page} de {totalPaginas} ({total} registros)
          </span>
          <button
            disabled={page >= totalPaginas}
            onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
