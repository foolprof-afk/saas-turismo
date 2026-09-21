"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/dashboard", label: "Dashboard", pagina: "dashboard" },
  { href: "/reservas", label: "Reservas", pagina: "reservas" },
  { href: "/cotizaciones", label: "Cotizaciones", pagina: "cotizaciones" },
  { href: "/clientes", label: "Clientes", pagina: "clientes" },
  { href: "/operacion", label: "Operación", pagina: "operacion" },
];

const NAV_ADMIN = [
  { href: "/reservas/cuadre", label: "Cuadre de caja", pagina: "reservas-cuadre" },
  { href: "/agencia", label: "Mi agencia", pagina: "agencia" },
  { href: "/usuarios", label: "Usuarios", pagina: "usuarios" },
  { href: "/logs", label: "Logs del sistema", pagina: "logs" },
  { href: "/tipos-servicio", label: "Tipos de servicio", pagina: "tipos-servicio" },
  { href: "/plantillas-itinerario", label: "Plantillas", pagina: "plantillas-itinerario" },
  { href: "/servicios", label: "Servicios", pagina: "servicios" },
  { href: "/proveedores", label: "Proveedores", pagina: "proveedores" },
  { href: "/ordenes-servicio", label: "Órdenes de servicio", pagina: "ordenes-servicio" },
  { href: "/vehiculos", label: "Vehículos", pagina: "vehiculos" },
  { href: "/guias", label: "Guías", pagina: "guias" },
  { href: "/rutas", label: "Rutas", pagina: "rutas" },
  { href: "/puntos-recogida", label: "Puntos de recogida", pagina: "puntos-recogida" },
  { href: "/impuestos", label: "Impuestos", pagina: "impuestos" },
  { href: "/monedas", label: "Monedas", pagina: "monedas" },
  { href: "/formas-pago", label: "Formas de pago", pagina: "formas-pago" },
  { href: "/listas-precio", label: "Listas de precio", pagina: "listas-precio" },
];

const ALL_NAV = [...NAV, ...NAV_ADMIN];

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!loading && !usuario) router.replace("/login");
  }, [loading, usuario, router]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  if (loading || !usuario) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Cargando...</div>;
  }

  const items = [
    ...(usuario.rol === "admin"
      ? ALL_NAV
      : [
          ...NAV.filter((item) => usuario.permisos?.[item.pagina]?.leer !== false),
          ...NAV_ADMIN.filter((item) => usuario.permisos?.[item.pagina]?.leer === true),
        ]),
    ...(usuario.agenciaEsPlataforma ? [{ href: "/agencias", label: "Agencias", pagina: "agencias" }] : []),
  ];

  const sidebarContent = (
    <>
      <p className="mb-6 text-sm font-semibold">SaaS Turismo</p>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded px-3 py-2 text-sm ${
              pathname.startsWith(item.href) ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 border-t pt-4 text-xs text-gray-500">
        <p>{usuario.nombre}</p>
        <p className="mb-2">{usuario.rol}</p>
        <button onClick={logout} className="text-red-600 hover:underline">
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="flex items-center justify-between border-b bg-white p-4 md:hidden">
        <p className="text-sm font-semibold">SaaS Turismo</p>
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="rounded border px-3 py-1.5 text-sm"
        >
          ☰ Menú
        </button>
      </header>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-white p-4 shadow-lg">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded border px-2 py-1 text-sm"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="hidden w-56 shrink-0 border-r bg-white p-4 md:block">{sidebarContent}</aside>
      <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
    </div>
  );
}
