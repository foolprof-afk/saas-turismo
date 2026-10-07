"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ItemCarrito, MonedaResumen, ServicioCatalogo } from "./types";
import { diasPorServicio } from "./dias";

const STORAGE_KEY = "guatetur_mi_viaje";

export interface SubtotalMoneda {
  moneda: MonedaResumen;
  subtotal: number;
  cantidadItems: number;
}

interface CarritoState {
  items: ItemCarrito[];
  cantidadPersonas: number;
}

interface CarritoContextValue {
  items: ItemCarrito[];
  cantidadPersonas: number;
  agregar: (servicio: ServicioCatalogo) => void;
  quitar: (servicioId: string) => void;
  estaEnCarrito: (servicioId: string) => boolean;
  setCantidadPersonas: (cantidad: number) => void;
  vaciar: () => void;
  totalDiasEstimados: number;
  subtotalesPorMoneda: SubtotalMoneda[];
  listo: boolean;
}

const CarritoContext = createContext<CarritoContextValue | null>(null);

function leerEstadoInicial(): CarritoState {
  if (typeof window === "undefined") return { items: [], cantidadPersonas: 1 };
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    if (!guardado) return { items: [], cantidadPersonas: 1 };
    const parsed = JSON.parse(guardado);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      cantidadPersonas: typeof parsed.cantidadPersonas === "number" && parsed.cantidadPersonas > 0 ? parsed.cantidadPersonas : 1,
    };
  } catch {
    return { items: [], cantidadPersonas: 1 };
  }
}

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cantidadPersonas, setCantidadPersonasState] = useState(1);
  const [listo, setListo] = useState(false);

  // Hidratar desde localStorage solo en el cliente (evita mismatch de SSR).
  useEffect(() => {
    const estado = leerEstadoInicial();
    setItems(estado.items);
    setCantidadPersonasState(estado.cantidadPersonas);
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, cantidadPersonas }));
  }, [items, cantidadPersonas, listo]);

  const agregar = useCallback((servicio: ServicioCatalogo) => {
    setItems((prev) => {
      if (prev.some((i) => i.servicioId === servicio.id)) return prev;
      const nuevo: ItemCarrito = {
        servicioId: servicio.id,
        nombre: servicio.nombre,
        fotoUrl: servicio.fotoUrl,
        precioBase: Number(servicio.precioBase),
        duracionMin: servicio.duracionMin,
        moneda: servicio.moneda,
        agregadoEn: new Date().toISOString(),
      };
      return [...prev, nuevo];
    });
  }, []);

  const quitar = useCallback((servicioId: string) => {
    setItems((prev) => prev.filter((i) => i.servicioId !== servicioId));
  }, []);

  const estaEnCarrito = useCallback((servicioId: string) => items.some((i) => i.servicioId === servicioId), [items]);

  const setCantidadPersonas = useCallback((cantidad: number) => {
    setCantidadPersonasState(cantidad < 1 ? 1 : cantidad);
  }, []);

  const vaciar = useCallback(() => {
    setItems([]);
    setCantidadPersonasState(1);
  }, []);

  const totalDiasEstimados = useMemo(
    () => items.reduce((acc, item) => acc + diasPorServicio(item.duracionMin), 0),
    [items],
  );

  const subtotalesPorMoneda = useMemo<SubtotalMoneda[]>(() => {
    const grupos = new Map<string, SubtotalMoneda>();
    for (const item of items) {
      const clave = item.moneda.codigo;
      const existente = grupos.get(clave);
      if (existente) {
        existente.subtotal += item.precioBase;
        existente.cantidadItems += 1;
      } else {
        grupos.set(clave, { moneda: item.moneda, subtotal: item.precioBase, cantidadItems: 1 });
      }
    }
    return Array.from(grupos.values());
  }, [items]);

  const value: CarritoContextValue = {
    items,
    cantidadPersonas,
    agregar,
    quitar,
    estaEnCarrito,
    setCantidadPersonas,
    vaciar,
    totalDiasEstimados,
    subtotalesPorMoneda,
    listo,
  };

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
}

export function useCarrito(): CarritoContextValue {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}
