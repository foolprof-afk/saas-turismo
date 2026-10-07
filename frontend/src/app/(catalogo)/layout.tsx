import { CarritoProvider } from "@/lib/catalogo/cart-context";
import { CarritoBar } from "@/components/catalogo/carrito-bar";

// Grupo de rutas público (Front Office / catálogo web de Guatetur). A propósito NO usa
// <AppShell> ni ningún guard de autenticación: cualquier visitante sin sesión debe poder ver el
// catálogo y armar su carrito (ver PRD Guatetur Front Office).
export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <CarritoProvider>
      <div className="min-h-screen bg-gray-50 pb-24">
        {children}
        <CarritoBar />
      </div>
    </CarritoProvider>
  );
}
