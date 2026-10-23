"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatMonto } from "@/lib/moneda";
import { BuscadorServicio } from "@/components/buscador-servicio";

interface Opcion {
  id: string;
  nombre: string;
}

interface ServicioOpcion {
  id: string;
  nombre: string;
  proveedorId: string;
  precioCosto?: string | null;
  moneda: { id: string; codigo: string; simbolo: string; tasaCambio: string };
  estado?: string;
}

interface Moneda {
  id: string;
  codigo: string;
  simbolo: string;
  tasaCambio: string;
  esPrincipal: boolean;
}

interface LineaOrden {
  servicioId: string;
  cantidad: string;
  precioCosto: string;
  monedaId: string;
  fechaServicio: string;
}

interface ReservaBusqueda {
  id: string;
  codigoReserva: string;
}

interface ReservaDetalle {
  id: string;
  codigoReserva: string;
  pasajeros: { nombre: string; telefono: string | null; esResponsable: boolean }[];
  itinerario: {
    dias: {
      fecha: string;
      servicios: {
        servicio: {
          id: string;
          precioCosto?: string | null;
          moneda: { id: string; codigo: string; simbolo: string; tasaCambio: string };
        };
      }[];
    }[];
  } | null;
}

// Misma convención de tasaCambio que en el resto del sistema (ver reserva-montos.util.ts en el
// backend): tasaCambio = cuántas unidades de esa moneda equivalen a 1 unidad de la moneda
// principal. Convertir de origen a destino es monto * tasaDestino / tasaOrigen.
function convertirMonto(monto: number, tasaOrigen: number, tasaDestino: number) {
  return (monto * tasaDestino) / tasaOrigen;
}

export default function NuevaOrdenServicioPage() {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<Opcion[]>([]);
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [proveedorId, setProveedorId] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<LineaOrden[]>([]);

  const [codigoReserva, setCodigoReserva] = useState("");
  const [buscandoReserva, setBuscandoReserva] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [reservaCargada, setReservaCargada] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Opcion[]>("/proveedores").then(setProveedores).catch(() => null);
    api.get<ServicioOpcion[]>("/servicios?limit=500").then(setServicios).catch(() => null);
    api.get<Moneda[]>("/monedas").then(setMonedas).catch(() => null);
  }, []);

  const monedaPrincipal = monedas.find((m) => m.esPrincipal);

  const agregarLinea = () => {
    const primero = servicios[0];
    if (!primero) return;
    setItems([
      ...items,
      {
        servicioId: primero.id,
        cantidad: "1",
        precioCosto: primero.precioCosto ?? "",
        monedaId: primero.moneda.id,
        fechaServicio: "",
      },
    ]);
  };

  const actualizarLinea = (index: number, cambios: Partial<LineaOrden>) => {
    setItems(items.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  };

  // Cambiar de servicio recarga el precio costo y la moneda por defecto del nuevo servicio
  // (ambos siguen siendo editables manualmente después).
  const cambiarServicioDeLinea = (index: number, servicioId: string) => {
    const servicio = servicios.find((s) => s.id === servicioId);
    actualizarLinea(index, {
      servicioId,
      precioCosto: servicio?.precioCosto ?? "",
      monedaId: servicio?.moneda.id ?? "",
    });
  };

  const quitarLinea = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Busca una reserva por código y precarga, como líneas de la orden, todos los servicios de su
  // itinerario (con su precioCosto de catálogo), sin filtrar por proveedor: el usuario puede
  // elegir el proveedor según disponibilidad/conveniencia, no necesariamente el mismo con el
  // que se vendió el servicio. No reemplaza las líneas existentes, solo agrega; el usuario
  // puede luego quitar o agregar más servicios manualmente.
  const buscarReserva = async () => {
    const codigo = codigoReserva.trim();
    if (!codigo) return;
    setBuscandoReserva(true);
    setErrorReserva(null);
    setReservaCargada(null);
    try {
      const coincidencias = await api.get<ReservaBusqueda[]>(
        `/reservas/buscar-codigo?codigo=${encodeURIComponent(codigo)}`,
      );
      const exacta = coincidencias.find((r) => r.codigoReserva.toLowerCase() === codigo.toLowerCase());
      const elegida = exacta ?? (coincidencias.length === 1 ? coincidencias[0] : undefined);
      if (!elegida) {
        setErrorReserva(
          coincidencias.length === 0
            ? "No se encontró ninguna reserva con ese código"
            : "Hay varias reservas que coinciden, escribe el código completo",
        );
        return;
      }
      const detalle = await api.get<ReservaDetalle>(`/reservas/${elegida.id}/operativo`);
      const lineasReserva = (detalle.itinerario?.dias ?? []).flatMap((dia) =>
        dia.servicios.map((s) => ({
          servicioId: s.servicio.id,
          cantidad: "1",
          precioCosto: s.servicio.precioCosto ?? "",
          monedaId: s.servicio.moneda.id,
          fechaServicio: dia.fecha.slice(0, 10),
        })),
      );
      if (lineasReserva.length === 0) {
        setErrorReserva("Esa reserva no tiene servicios");
        return;
      }
      setItems([...items, ...lineasReserva]);
      const pasajero =
        detalle.pasajeros.find((p) => p.esResponsable) ?? detalle.pasajeros[0];
      if (pasajero) {
        const datosPasajero = [pasajero.nombre, pasajero.telefono, `${detalle.pasajeros.length} pasajero(s)`]
          .filter((v): v is string => Boolean(v))
          .join(" ");
        setNotas(notas ? `${notas} ${datosPasajero}` : datosPasajero);
      }
      setReservaCargada(detalle.codigoReserva);
    } catch (err) {
      setErrorReserva(err instanceof ApiError ? err.message : "No se pudo buscar la reserva");
    } finally {
      setBuscandoReserva(false);
    }
  };

  // Cada línea puede quedar en una moneda distinta a la del servicio (el vendedor la puede
  // cambiar manualmente), así que los totales se agrupan por item.monedaId, no por la moneda
  // del servicio.
  const totalPorMoneda = () => {
    const porMoneda = new Map<string, { total: number; simbolo: string }>();
    for (const item of items) {
      const moneda = monedas.find((m) => m.id === item.monedaId);
      if (!moneda || item.precioCosto === "") continue;
      const entry = porMoneda.get(moneda.codigo) ?? { total: 0, simbolo: moneda.simbolo };
      entry.total += Number(item.precioCosto) * (Number(item.cantidad) || 0);
      porMoneda.set(moneda.codigo, entry);
    }
    return Array.from(porMoneda.entries()).map(([codigo, v]) => ({ codigo, ...v }));
  };

  // Este total adicional convierte todo a la moneda predeterminada (principal) de la agencia
  // usando su tasaCambio, para tener una referencia única de cuánto representa la orden en
  // conjunto, sin importar en qué moneda quedó cada línea.
  const totalConvertidoPrincipal = () => {
    if (!monedaPrincipal) return null;
    let total = 0;
    for (const item of items) {
      const moneda = monedas.find((m) => m.id === item.monedaId);
      if (!moneda || item.precioCosto === "") continue;
      const monto = Number(item.precioCosto) * (Number(item.cantidad) || 0);
      total += convertirMonto(monto, Number(moneda.tasaCambio), Number(monedaPrincipal.tasaCambio));
    }
    return total;
  };

  const totales = totalPorMoneda();
  const hayOtraMoneda = monedaPrincipal
    ? totales.some((t) => t.codigo !== monedaPrincipal.codigo)
    : false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError("Agrega al menos un servicio");
      return;
    }
    setSaving(true);
    try {
      const orden = await api.post<{ id: string }>("/ordenes-servicio", {
        proveedorId,
        notas: notas || undefined,
        items: items.map((l) => ({
          servicioId: l.servicioId,
          cantidad: Number(l.cantidad),
          fechaServicio: l.fechaServicio,
          precioCosto: l.precioCosto !== "" ? Number(l.precioCosto) : undefined,
          monedaId: l.monedaId || undefined,
        })),
      });
      router.push(`/ordenes-servicio/${orden.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la orden de servicio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nueva orden de servicio</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <div>
          <label className="block text-sm font-medium">Proveedor</label>
          <select
            required
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm sm:w-1/2"
          >
            <option value="">Seleccionar...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium"># Reserva (opcional)</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={codigoReserva}
              onChange={(e) => setCodigoReserva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscarReserva();
                }
              }}
              placeholder="Ej. RES-AB12CD34"
              className="w-full rounded border px-3 py-2 text-sm sm:w-1/2"
            />
            <button
              type="button"
              onClick={buscarReserva}
              disabled={!codigoReserva.trim() || buscandoReserva}
              className="shrink-0 rounded border px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              {buscandoReserva ? "Buscando..." : "Cargar servicios"}
            </button>
          </div>
          {errorReserva && <p className="mt-1 text-xs text-red-600">{errorReserva}</p>}
          {reservaCargada && (
            <p className="mt-1 text-xs text-emerald-600">Servicios cargados desde la reserva {reservaCargada}.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Servicios a solicitar</h2>
            <button
              type="button"
              onClick={agregarLinea}
              disabled={!proveedorId || servicios.length === 0}
              className="rounded border px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              + Agregar servicio
            </button>
          </div>
          {!proveedorId && (
            <p className="text-sm text-gray-400">Selecciona un proveedor para agregar servicios a la orden.</p>
          )}

          {items.map((linea, index) => {
            return (
              <div key={index} className="space-y-2 rounded border p-3">
                <BuscadorServicio
                  required
                  servicios={servicios.map((s) => ({ id: s.id, nombre: s.nombre, etiqueta: s.moneda.codigo, estado: s.estado }))}
                  value={linea.servicioId}
                  onChange={(sid) => cambiarServicioDeLinea(index, sid)}
                  className="w-full rounded border px-3 py-2.5 text-base"
                />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[140px_100px_110px_140px_auto]">
                  <input
                    type="date"
                    required
                    value={linea.fechaServicio}
                    onChange={(e) => actualizarLinea(index, { fechaServicio: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    required
                    value={linea.cantidad}
                    onChange={(e) => actualizarLinea(index, { cantidad: e.target.value })}
                    placeholder="Cant."
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <select
                    required
                    value={linea.monedaId}
                    onChange={(e) => actualizarLinea(index, { monedaId: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {monedas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigo}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={linea.precioCosto}
                    onChange={(e) => actualizarLinea(index, { precioCosto: e.target.value })}
                    placeholder="Precio costo"
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => quitarLinea(index)}
                    className="col-span-2 text-sm text-red-600 hover:underline sm:col-span-1 sm:self-center"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="text-right text-sm font-semibold">
            {totales.map((t) => (
              <div key={t.codigo}>
                Total {t.codigo}: {t.simbolo} {formatMonto(t.total)}
              </div>
            ))}
            {hayOtraMoneda && monedaPrincipal && (
              <div className="mt-1 text-xs font-normal text-gray-500">
                Total convertido a {monedaPrincipal.codigo} (moneda predeterminada): {monedaPrincipal.simbolo}{" "}
                {formatMonto(totalConvertidoPrincipal() ?? 0)}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Observaciones (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Ej. nombres de los pasajeros, indicaciones especiales, etc."
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Creando..." : "Crear orden de servicio"}
        </button>
      </form>
    </div>
  );
}
