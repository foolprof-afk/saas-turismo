"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/dashboard", label: "Dashboard", pagina: "dashboard" },
  { href: "/reservas", label: "Reservas", pagina: "reservas" },
  { href: "/clientes", label: "Clientes", pagina: "clientes" },
  { href: "/operacion", label: "Operación", pagina: "operacion" },
];

const NAV_ADMIN = [
  { href: "/reservas/cuadre", label: "Cuadre de caja", pagina: "reservas-cuadre" },
  { href: "/usuarios", label: "Usuarios", pagina: "usuarios" },
  { href: "/tipos-servicio", label: "Tipos de servicio", pagina: "tipos-servicio" },
  { href: "/plantillas-itinerario", label: "Plantillas", pagina: "plantillas-itinerario" },
  { href: "/servicios", label: "Servicios", pagina: "servicios" },
  { href: "/proveedores", label: "Proveedores", pagina: "proveedores" },
  { href: "/vehiculos", label: "Vehículos", pagina: "vehiculos" },
  { href: "/guias", label: "Guías", pagina: "guias" },
  { href: "/rutas", label: "Rutas", pagina: "rutas" },
  { href: "/puntos-recogida", label: "Puntos de recogida", pagina: "puntos-recogida" },
  { href: "/impuestos", label: "Impuestos", pagina: "impuestos" },
  { href: "/monedas", label: "Monedas", pagina: "monedas" },
  { href: "/formas-pago", label: "Formas de pago", pagina: "formas-pago" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !usuario) router.replace("/login");
  }, [loading, usuario, router]);

  if (loading || !usuario) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Cargando...</div>;
  }

  const items =
    usuario.rol === "admin"
      ? [...NAV, ...NAV_ADMIN]
      : [
          ...NAV.filter((item) => usuario.permisos?.[item.pagina]?.leer !== false),
          ...NAV_ADMIN.filter((item) => usuario.permisos?.[item.pagina]?.leer === true),
        ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-white p-4">
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
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
