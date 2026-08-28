"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Comercial {
  reservasPendientes: number;
  reservasConfirmadas: number;
  reservasHoy: number;
}
interface Operacion {
  pendientesHoy: number;
  completadosHoy: number;
}
interface Finanzas {
  totalReservado: number;
  liquidacionesPendientes: number;
}

function Card({ title, items }: { title: string; items: { label: string; value: string | number }[] }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-500">{title}</h2>
      <dl className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <dt className="text-sm text-gray-600">{item.label}</dt>
            <dd className="text-lg font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DashboardPage() {
  const [comercial, setComercial] = useState<Comercial | null>(null);
  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [finanzas, setFinanzas] = useState<Finanzas | null>(null);

  useEffect(() => {
    api.get<Comercial>("/dashboard/comercial").then(setComercial).catch(() => null);
    api.get<Operacion>("/dashboard/operacion").then(setOperacion).catch(() => null);
    api.get<Finanzas>("/dashboard/finanzas").then(setFinanzas).catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card
          title="Comercial"
          items={[
            { label: "Pendientes", value: comercial?.reservasPendientes ?? "—" },
            { label: "Confirmadas", value: comercial?.reservasConfirmadas ?? "—" },
            { label: "Servicios hoy", value: comercial?.reservasHoy ?? "—" },
          ]}
        />
        <Card
          title="Operación"
          items={[
            { label: "Pendientes hoy", value: operacion?.pendientesHoy ?? "—" },
            { label: "Completados hoy", value: operacion?.completadosHoy ?? "—" },
          ]}
        />
        <Card
          title="Finanzas"
          items={[
            { label: "Total reservado", value: finanzas ? finanzas.totalReservado : "—" },
            { label: "Liquidaciones pendientes", value: finanzas?.liquidacionesPendientes ?? "—" },
          ]}
        />
      </div>
    </div>
  );
}
