"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { hoyLocal } from "@/lib/fecha";

interface CalendarioEntrada {
  fecha: string;
  reservaId: string;
  codigoReserva: string;
  estado: string;
  clienteNombre: string;
  servicios: string[];
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-300",
  CONFIRMADA: "bg-green-100 text-green-800 border-green-300",
  OPERADA: "bg-blue-100 text-blue-800 border-blue-300",
};

const MAX_VISIBLE = 4;

// El backend ya devuelve `fecha` como YYYY-MM-DDT00:00:00.000Z (día calendario puro, sin hora
// real asociada), así que tomar los primeros 10 caracteres da directamente la clave de día
// correcta sin depender de la zona horaria del navegador (mismo criterio que formatFecha).
function claveDia(fechaIso: string): string {
  return fechaIso.slice(0, 10);
}

function diasEnMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function primerDiaSemana(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();
}

function EntradaCard({
  entrada,
  onClick,
}: {
  entrada: CalendarioEntrada;
  onClick: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className={`cursor-pointer rounded border p-3 text-sm hover:shadow-sm ${COLOR_ESTADO[entrada.estado] ?? "border-gray-300 bg-gray-50"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{entrada.clienteNombre}</span>
        <span className="whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5 text-xs">{entrada.estado}</span>
      </div>
      {entrada.servicios.length > 0 && (
        <p className="mt-1 text-xs text-gray-600">{entrada.servicios.join(", ")}</p>
      )}
      <p className="mt-0.5 font-mono text-xs text-gray-400">{entrada.codigoReserva}</p>
    </li>
  );
}

export default function CalendarioReservasPage() {
  const router = useRouter();
  const hoy = new Date();

  const [vista, setVista] = useState<"mes" | "dia">("mes");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [fechaDia, setFechaDia] = useState(hoyLocal());
  const [entradas, setEntradas] = useState<CalendarioEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diaModal, setDiaModal] = useState<string | null>(null);

  const anioConsulta = vista === "dia" ? Number(fechaDia.slice(0, 4)) : anio;
  const mesConsulta = vista === "dia" ? Number(fechaDia.slice(5, 7)) : mes;

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<CalendarioEntrada[]>(`/reservas/calendario?anio=${anioConsulta}&mes=${mesConsulta}`)
      .then(setEntradas)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el calendario"))
      .finally(() => setLoading(false));
  }, [anioConsulta, mesConsulta]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, CalendarioEntrada[]>();
    for (const e of entradas) {
      const clave = claveDia(e.fecha);
      const lista = mapa.get(clave) ?? [];
      lista.push(e);
      mapa.set(clave, lista);
    }
    return mapa;
  }, [entradas]);

  const cambiarMes = (delta: number) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes > 12) {
      nuevoMes = 1;
      nuevoAnio += 1;
    } else if (nuevoMes < 1) {
      nuevoMes = 12;
      nuevoAnio -= 1;
    }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const irHoy = () => {
    setMes(hoy.getMonth() + 1);
    setAnio(hoy.getFullYear());
    setFechaDia(hoyLocal());
  };

  const irAReserva = (id: string) => router.push(`/reservas/${id}`);

  const celdas: (number | null)[] = [];
  if (vista === "mes") {
    const total = diasEnMes(anio, mes);
    const inicio = primerDiaSemana(anio, mes);
    for (let i = 0; i < inicio; i++) celdas.push(null);
    for (let d = 1; d <= total; d++) celdas.push(d);
    while (celdas.length % 7 !== 0) celdas.push(null);
  }

  const diaModalEntradas = diaModal ? porDia.get(diaModal) ?? [] : [];
  const diaEntradasVista = vista === "dia" ? porDia.get(fechaDia) ?? [] : [];
  const hoyClave = hoyLocal();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Calendario de reservas</h1>
        <div className="flex gap-2">
          <Link href="/reservas" className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Ver listado
          </Link>
          <button
            onClick={() => setVista("mes")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${vista === "mes" ? "bg-gray-900 text-white" : "border text-gray-700"}`}
          >
            Mes
          </button>
          <button
            onClick={() => setVista("dia")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${vista === "dia" ? "bg-gray-900 text-white" : "border text-gray-700"}`}
          >
            Día
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4">
        {vista === "mes" ? (
          <>
            <button onClick={() => cambiarMes(-1)} className="rounded border px-2 py-1 text-sm" aria-label="Mes anterior">
              ‹
            </button>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="rounded border px-3 py-2 text-sm"
            >
              {MESES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>
                  {nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-24 rounded border px-3 py-2 text-sm"
            />
            <button onClick={() => cambiarMes(1)} className="rounded border px-2 py-1 text-sm" aria-label="Mes siguiente">
              ›
            </button>
            <button onClick={irHoy} className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              Hoy
            </button>
          </>
        ) : (
          <>
            <input
              type="date"
              value={fechaDia}
              onChange={(e) => setFechaDia(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
            <button onClick={irHoy} className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              Hoy
            </button>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-yellow-400 bg-yellow-200" /> Pendiente
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-green-400 bg-green-200" /> Confirmada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-blue-400 bg-blue-200" /> Operada
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Cargando...</p>}

      {!loading && vista === "mes" && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="grid grid-cols-7 bg-gray-50 text-center text-xs font-semibold text-gray-500">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celdas.map((d, i) => {
              if (d === null) return <div key={i} className="min-h-[110px] border-t border-l bg-gray-50" />;
              const clave = `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const entradasDia = porDia.get(clave) ?? [];
              const visibles = entradasDia.slice(0, MAX_VISIBLE);
              const restantes = entradasDia.length - visibles.length;
              const esHoy = clave === hoyClave;
              return (
                <div key={i} className={`min-h-[110px] border-t border-l p-1 ${esHoy ? "bg-blue-50/40" : ""}`}>
                  <p className={`mb-1 text-xs font-medium ${esHoy ? "text-blue-700" : "text-gray-500"}`}>{d}</p>
                  <div className="space-y-0.5">
                    {visibles.map((e) => (
                      <button
                        key={e.reservaId}
                        onClick={() => irAReserva(e.reservaId)}
                        title={`${e.clienteNombre} — ${e.servicios.join(", ")}`}
                        className={`block w-full truncate rounded border px-1 py-0.5 text-left text-[11px] ${COLOR_ESTADO[e.estado] ?? "border-gray-300 bg-gray-100 text-gray-700"}`}
                      >
                        {e.clienteNombre}
                      </button>
                    ))}
                    {restantes > 0 && (
                      <button
                        onClick={() => setDiaModal(clave)}
                        className="block w-full rounded px-1 py-0.5 text-left text-[11px] font-medium text-blue-600 hover:underline"
                      >
                        +{restantes} más
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && vista === "dia" && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            Reservas del {fechaDia.split("-").reverse().join("/")}
          </h2>
          {diaEntradasVista.length === 0 && <p className="text-sm text-gray-400">Sin reservas este día</p>}
          <ul className="space-y-2">
            {diaEntradasVista.map((e) => (
              <EntradaCard key={e.reservaId} entrada={e} onClick={() => irAReserva(e.reservaId)} />
            ))}
          </ul>
        </div>
      )}

      {diaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Reservas del {diaModal.split("-").reverse().join("/")}</h3>
              <button onClick={() => setDiaModal(null)} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>
            <ul className="space-y-2">
              {diaModalEntradas.map((e) => (
                <EntradaCard key={e.reservaId} entrada={e} onClick={() => irAReserva(e.reservaId)} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
