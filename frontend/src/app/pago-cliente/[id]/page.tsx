"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { formatMonto } from "@/lib/moneda";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Mientras el webhook del proveedor todavía no confirmó el pago, el link sigue PENDIENTE: se
// reintenta unas cuantas veces antes de mostrar un mensaje de "seguimos confirmando" en vez de
// dejar al cliente viendo un estado que ya cambió del lado del proveedor.
const INTENTOS_MAX = 10;
const INTERVALO_MS = 2500;

interface LinkPagoPublico {
  estado: "PENDIENTE" | "PAGADO" | "EXPIRADO" | "CANCELADO";
  monto: string;
  moneda: { codigo: string; simbolo: string };
  reserva: { codigoReserva: string };
}

export default function PagoClientePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const resultadoHint = searchParams.get("resultado"); // "exitoso" | "cancelado", solo para el mensaje mientras se confirma

  const [linkPago, setLinkPago] = useState<LinkPagoPublico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agotado, setAgotado] = useState(false);
  const intentos = useRef(0);

  useEffect(() => {
    let cancelado = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const consultar = () => {
      fetch(`${API_URL}/pago-cliente/publico/${params.id}`)
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "No se pudo validar el link de pago" }));
            throw new Error(body.message ?? "No se pudo validar el link de pago");
          }
          return res.json() as Promise<LinkPagoPublico>;
        })
        .then((data) => {
          if (cancelado) return;
          setLinkPago(data);
          if (data.estado === "PENDIENTE" && intentos.current < INTENTOS_MAX) {
            intentos.current += 1;
            timeoutId = setTimeout(consultar, INTERVALO_MS);
          } else if (data.estado === "PENDIENTE") {
            setAgotado(true);
          }
        })
        .catch((err) => {
          if (!cancelado) setError(err instanceof Error ? err.message : "No se pudo validar el link de pago");
        });
    };

    consultar();
    return () => {
      cancelado = true;
      clearTimeout(timeoutId);
    };
  }, [params.id]);

  if (error) {
    return (
      <Tarjeta color="red">
        <p className="text-lg font-semibold text-red-600">Enlace inválido</p>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
      </Tarjeta>
    );
  }

  if (!linkPago) {
    return (
      <Tarjeta>
        <p className="text-sm text-gray-400">Verificando tu pago...</p>
      </Tarjeta>
    );
  }

  if (linkPago.estado === "PAGADO") {
    return (
      <Tarjeta color="green">
        <p className="text-lg font-semibold text-green-700">¡Pago confirmado!</p>
        <p className="mt-2 text-sm text-gray-600">
          Reserva {linkPago.reserva.codigoReserva} — {linkPago.moneda.simbolo}
          {formatMonto(linkPago.monto)} {linkPago.moneda.codigo}
        </p>
      </Tarjeta>
    );
  }

  if (linkPago.estado === "CANCELADO" || linkPago.estado === "EXPIRADO") {
    return (
      <Tarjeta color="amber">
        <p className="text-lg font-semibold text-amber-700">
          {linkPago.estado === "EXPIRADO" ? "Este link de pago expiró" : "Pago cancelado"}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Reserva {linkPago.reserva.codigoReserva}. Si fue un error, pide un nuevo link de pago a la agencia.
        </p>
      </Tarjeta>
    );
  }

  // PENDIENTE: aún no llega la confirmación del webhook.
  if (agotado) {
    return (
      <Tarjeta color="amber">
        <p className="text-lg font-semibold text-amber-700">
          {resultadoHint === "cancelado" ? "Pago cancelado" : "Estamos confirmando tu pago"}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Reserva {linkPago.reserva.codigoReserva}.{" "}
          {resultadoHint === "cancelado"
            ? "Si fue un error, pide un nuevo link de pago a la agencia."
            : "Puede tardar unos minutos en confirmarse; la agencia te contactará apenas se registre."}
        </p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta>
      <p className="text-sm text-gray-400">Confirmando tu pago...</p>
    </Tarjeta>
  );
}

function Tarjeta({ children, color }: { children: React.ReactNode; color?: "red" | "green" | "amber" }) {
  const borde = color === "red" ? "border-red-200" : color === "green" ? "border-green-200" : color === "amber" ? "border-amber-200" : "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className={`max-w-sm rounded-lg border bg-white p-6 text-center ${borde}`}>{children}</div>
    </div>
  );
}
