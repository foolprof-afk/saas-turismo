"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Rol {
  id: string;
  nombre: string;
}

interface Cliente {
  id: string;
  nombre: string;
}

interface PermisoAccion {
  leer?: boolean;
  escribir?: boolean;
  eliminar?: boolean;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  estado: string;
  rol: Rol;
  rolId: string;
  clienteId?: string | null;
  cliente?: Cliente | null;
  permisos?: Record<string, PermisoAccion>;
}

const PAGINAS = [
  { key: "reservas-cuadre", label: "Cuadre de caja" },
  { key: "usuarios", label: "Usuarios" },
  { key: "tipos-servicio", label: "Tipos de servicio" },
  { key: "plantillas-itinerario", label: "Plantillas" },
  { key: "servicios", label: "Servicios" },
  { key: "proveedores", label: "Proveedores" },
  { key: "vehiculos", label: "Vehículos" },
  { key: "guias", label: "Guías" },
  { key: "rutas", label: "Rutas" },
  { key: "puntos-recogida", label: "Puntos de recogida" },
  { key: "impuestos", label: "Impuestos" },
  { key: "monedas", label: "Monedas" },
  { key: "formas-pago", label: "Formas de pago" },
];

const permisosVacios = (): Record<string, PermisoAccion> =>
  Object.fromEntries(PAGINAS.map((p) => [p.key, { leer: false, escribir: false, eliminar: false }]));

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [telefono, setTelefono] = useState("");
  const [estado, setEstado] = useState("ACTIVO");
  const [clienteId, setClienteId] = useState("");
  const [permisos, setPermisos] = useState<Record<string, PermisoAccion>>(permisosVacios());

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Usuario[]>("/usuarios?limit=500")
      .then(setUsuarios)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get<Rol[]>("/roles").then(setRoles).catch(() => null);
    api.get<Cliente[]>("/clientes?limit=500").then(setClientes).catch(() => null);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setRolId("");
    setTelefono("");
    setEstado("ACTIVO");
    setClienteId("");
    setPermisos(permisosVacios());
  };

  const editar = (u: Usuario) => {
    setEditingId(u.id);
    setNombre(u.nombre);
    setEmail(u.email);
    setPassword("");
    setRolId(u.rolId ?? u.rol?.id ?? "");
    setTelefono(u.telefono ?? "");
    setEstado(u.estado);
    setClienteId(u.clienteId ?? "");
    setPermisos({ ...permisosVacios(), ...(u.permisos ?? {}) });
  };

  const togglePermiso = (pagina: string, accion: keyof PermisoAccion) => {
    setPermisos((prev) => ({
      ...prev,
      [pagina]: { ...prev[pagina], [accion]: !prev[pagina]?.[accion] },
    }));
  };

  const cambiarEstado = async (u: Usuario) => {
    try {
      await api.put(`/usuarios/${u.id}`, { estado: u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO" });
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado del usuario");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        const data: Record<string, unknown> = {
          nombre,
          email,
          rolId,
          telefono: telefono || undefined,
          estado,
          clienteId: clienteId || null,
          permisos,
        };
        if (password) data.password = password;
        await api.put(`/usuarios/${editingId}`, data);
      } else {
        await api.post("/usuarios", {
          nombre,
          email,
          password,
          rolId,
          telefono: telefono || undefined,
          clienteId: clienteId || undefined,
          permisos,
        });
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">
          {editingId ? "Editar usuario" : "Nuevo usuario"}
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
            <label className="block text-sm font-medium">
              Contraseña {editingId && <span className="text-gray-400">(dejar vacío para no cambiar)</span>}
            </label>
            <input
              type="password"
              required={!editingId}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Teléfono (opcional)</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          {editingId && (
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
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Cliente asociado (opcional)</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Permisos por página</label>
          <div className="overflow-hidden rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2">Página</th>
                  <th className="px-3 py-2">Leer</th>
                  <th className="px-3 py-2">Escribir</th>
                  <th className="px-3 py-2">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {PAGINAS.map((p) => (
                  <tr key={p.key} className="border-t">
                    <td className="px-3 py-2">{p.label}</td>
                    {(["leer", "escribir", "eliminar"] as const).map((accion) => (
                      <td key={accion} className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!permisos[p.key]?.[accion]}
                          onChange={() => togglePermiso(p.key, accion)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear usuario"}
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
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Cliente</th>
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
            {!loading && usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No hay usuarios todavía
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.nombre}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.rol?.nombre}</td>
                <td className="px-4 py-2">{u.cliente?.nombre ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      u.estado === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {u.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(u)} className="mr-3 text-blue-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => cambiarEstado(u)} className="text-amber-600 hover:underline">
                    {u.estado === "ACTIVO" ? "Desactivar" : "Activar"}
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
