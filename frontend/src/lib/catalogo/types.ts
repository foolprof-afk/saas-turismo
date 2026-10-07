// Tipos del catálogo público (Front Office). Reflejan la forma de la respuesta de
// GET /servicios (vía el proxy /catalogo-proxy/servicios) para el rol catalogo_web: ver
// ServiciosService.whereCatalogo / INCLUDE_ASOCIACIONES en el backend.

export interface MonedaResumen {
  id?: string;
  codigo: string;
  simbolo: string;
}

export interface ServicioAsociadoResumen {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  precioBase: string | number;
  duracionMin: number | null;
  moneda: MonedaResumen;
}

export interface AsociacionCatalogo {
  id: string;
  orden: number;
  servicioAsociado: ServicioAsociadoResumen;
}

export interface ServicioCatalogo {
  id: string;
  nombre: string;
  descripcion: string | null;
  capacidadMax: number | null;
  duracionMin: number | null;
  precioBase: string | number;
  fotoUrl: string | null;
  estadoPublicacion: "PUBLICO" | "PRIVADO";
  moneda: MonedaResumen;
  tipoServicio?: { id: string; nombre: string } | null;
  asociaciones?: AsociacionCatalogo[];
}

// Un servicio agregado al carrito "Mi viaje". Se congela lo necesario para mostrarlo sin
// depender de que el servicio siga disponible/publicado más adelante.
export interface ItemCarrito {
  servicioId: string;
  nombre: string;
  fotoUrl: string | null;
  precioBase: number;
  duracionMin: number | null;
  moneda: MonedaResumen;
  agregadoEn: string; // ISO timestamp, para poder ordenar el carrito por orden de agregado
}
