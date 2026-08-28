"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

interface Servicio {
  id: string;
  nombre: string;
  precioBase: string;
}

interface Plantilla {
  id: string;
  nombre: string;
  descripcion?: string | null;
  diasTotales: number;
}

interface PlantillaServicioDetalle {
  servicioId: string;
  horaInicio: string;
  orden: number;
  servicio: { precioBase: string };
}

interface PlantillaDiaDetalle {
  numeroDia: number;
  servicios: PlantillaServicioDetalle[];
}

interface PlantillaDetalle extends Plantilla {
  dias: PlantillaDiaDetalle[];
}

type DiaForm = {
  numeroDia: number;
  servicios: { servicioId: string; horaInicio: string; orden: number }[];
};

const totalDeDias = (dias: PlantillaDiaDetalle[]) =>
  dias.reduce((acc, dia) => acc + dia.servicios.reduce((s, item) => s + Number(item.servicio.precioBase), 0), 0);

export default function PlantillasItinerarioPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [totales, setTotales] = useState<Record<string, number>>({});
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [dias, setDias] = useState<DiaForm[]>([{ numeroDia: 1, servicios: [] }]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    setLoading(true);
    api
      .get<Plantilla[]>("/plantillas-itinerario?limit=500")
      .then((lista) => {
        setPlantillas(lista);
        Promise.all(
          lista.map((p) =>
            api
              .get<PlantillaDetalle>(`/plantillas-itinerario/${p.id}`)
              .then((detalle) => [p.id, totalDeDias(detalle.dias)] as const)
              .catch(() => [p.id, 0] as const),
          ),
        ).then((entries) => setTotales(Object.fromEntries(entries)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get<Servicio[]>("/servicios?limit=500").then(setServicios).catch(() => null);
  }, []);

  const precioServicio = (servicioId: string) => Number(servicios.find((sv) => sv.id === servicioId)?.precioBase ?? 0);

  const totalDia = (dia: DiaForm) => dia.servicios.reduce((acc, s) => acc + precioServicio(s.servicioId), 0);

  const totalGeneral = dias.reduce((acc, dia) => acc + totalDia(dia), 0);

  const agregarDia = () => setDias((d) => [...d, { numeroDia: d.length + 1, servicios: [] }]);

  const quitarDia = (i: number) =>
    setDias((d) =>
      d.filter((_, idx) => idx !== i).map((dia, idx) => ({ ...dia, numeroDia: idx + 1 })),
    );

  const agregarServicio = (diaIdx: number) =>
    setDias((d) =>
      d.map((dia, idx) =>
        idx === diaIdx
          ? { ...dia, servicios: [...dia.servicios, { servicioId: "", horaInicio: "09:00", orden: dia.servicios.length }] }
          : dia,
      ),
    );

  const quitarServicio = (diaIdx: number, servIdx: number) =>
    setDias((d) =>
      d.map((dia, idx) =>
        idx === diaIdx ? { ...dia, servicios: dia.servicios.filter((_, si) => si !== servIdx) } : dia,
      ),
    );

  const actualizarServicio = (
    diaIdx: number,
    servIdx: number,
    data: Partial<{ servicioId: string; horaInicio: string }>,
  ) =>
    setDias((d) =>
      d.map((dia, idx) =>
        idx === diaIdx
          ? {
              ...dia,
              servicios: dia.servicios.map((s, si) => (si === servIdx ? { ...s, ...data } : s)),
            }
          : dia,
      ),
    );

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setDescripcion("");
    setDias([{ numeroDia: 1, servicios: [] }]);
  };

  const editar = async (p: Plantilla) => {
    setError(null);
    try {
      const detalle = await api.get<PlantillaDetalle>(`/plantillas-itinerario/${p.id}`);
      setEditingId(detalle.id);
      setNombre(detalle.nombre);
      setDescripcion(detalle.descripcion ?? "");
      setDias(
        detalle.dias.map((dia) => ({
          numeroDia: dia.numeroDia,
          servicios: dia.servicios.map((s) => ({ servicioId: s.servicioId, horaInicio: s.horaInicio, orden: s.orden })),
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la plantilla");
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    try {
      await api.delete(`/plantillas-itinerario/${id}`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la plantilla");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = {
        nombre,
        descripcion: descripcion || undefined,
        diasTotales: dias.length,
        dias,
      };
      if (editingId) {
        await api.put(`/plantillas-itinerario/${editingId}`, data);
      } else {
        await api.post("/plantillas-itinerario", data);
      }
      resetForm();
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Plantillas de itinerario</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">
          {editingId ? "Editar plantilla" : "Nueva plantilla"}
        </h2>

        {servicios.length === 0 && (
          <p className="text-xs text-amber-600">
            No hay servicios creados todavía. Crea servicios primero para poder asignarlos a los días.
          </p>
        )}

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
            <label className="block text-sm font-medium">Descripción (opcional)</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Días</label>
            <button type="button" onClick={agregarDia} className="text-sm text-blue-600 hover:underline">
              + Agregar día
            </button>
          </div>

          {dias.map((dia, diaIdx) => (
            <div key={diaIdx} className="rounded border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Día {dia.numeroDia}</p>
                {dias.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarDia(diaIdx)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Quitar día
                  </button>
                )}
              </div>

              {dia.servicios.map((s, servIdx) => (
                <div key={servIdx} className="flex gap-2">
                  <select
                    required
                    value={s.servicioId}
                    onChange={(e) => actualizarServicio(diaIdx, servIdx, { servicioId: e.target.value })}
                    className="flex-1 rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar servicio...</option>
                    {servicios.map((sv) => (
                      <option key={sv.id} value={sv.id}>
                        {sv.nombre} — {Number(sv.precioBase).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    required
                    value={s.horaInicio}
                    onChange={(e) => actualizarServicio(diaIdx, servIdx, { horaInicio: e.target.value })}
                    className="rounded border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => quitarServicio(diaIdx, servIdx)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => agregarServicio(diaIdx)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Agregar servicio al día {dia.numeroDia}
                </button>
                <p className="text-xs font-medium text-gray-600">Subtotal día: {totalDia(dia).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded border bg-gray-50 px-3 py-2 text-right">
          <span className="text-sm font-semibold text-gray-700">Total plantilla: {totalGeneral.toFixed(2)}</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear plantilla"}
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
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Días</th>
              <th className="px-4 py-2">Total</th>
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
            {!loading && plantillas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No hay plantillas todavía
                </td>
              </tr>
            )}
            {plantillas.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.nombre}</td>
                <td className="px-4 py-2">{p.descripcion ?? "-"}</td>
                <td className="px-4 py-2">{p.diasTotales}</td>
                <td className="px-4 py-2">{(totales[p.id] ?? 0).toFixed(2)}</td>
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
