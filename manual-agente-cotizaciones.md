# Manual para agente: creación de cotizaciones

Este documento está escrito para entrenar/instruir a un agente de IA que debe **crear
cotizaciones en el sistema directamente contra la API**, a partir de información en
lenguaje natural (p. ej. un mensaje de un cliente pidiendo un viaje). No cubre otras
partes del sistema; para el modelo de datos completo ver `modelo-datos.md`, y para la
arquitectura general ver `arquitectura-backend.md`.

## 1. Entorno

- **API base URL**: `http://2.24.118.206:3000` en producción (o `http://localhost:3000`
  en desarrollo). No hay prefijo `/api`; los endpoints van directo en la raíz
  (ej. `POST /cotizaciones`).
- Todas las respuestas son JSON. Content-Type de las peticiones: `application/json`.
- La API es **multi-agencia** (multi-tenant): cada usuario pertenece a una agencia
  (`agenciaId`) y solo puede ver/crear datos de esa agencia. El `agenciaId` nunca se
  manda en el body — se deriva del JWT.

## 2. Autenticación

### 2.1 Login

```
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@agencia.com",
  "password": "contraseña",
  "agenciaSlug": "opcional-subdominio-agencia"
}
```

- `email`: string, debe ser email válido.
- `password`: string, mínimo 6 caracteres.
- `agenciaSlug`: **opcional**. Si el mismo email existe en más de una agencia, se puede
  usar para desambiguar. Si se omite, el backend prueba la contraseña contra todos los
  usuarios activos con ese email en agencias activas, hasta encontrar el que corresponde.
- Endpoint público (no requiere token).

Respuesta (200):
```json
{
  "accessToken": "eyJ...",
  "usuario": {
    "id": "uuid",
    "nombre": "...",
    "email": "...",
    "rol": "admin" | "vendedor" | "catalogo_web" | "...",
    "agenciaId": "uuid",
    "clienteId": "uuid|null",
    "permisos": {...},
    "agenciaEsPlataforma": false,
    "agenciaSlug": "..."
  }
}
```

### 2.2 Autorizar peticiones

Todas las peticiones a endpoints protegidos deben incluir:

```
Authorization: Bearer <accessToken>
```

El JWT codifica `sub` (usuarioId), `agenciaId`, `rol`, `email`. No hace falta
refrescarlo manualmente a menos que expire (ver configuración de `JwtModule`, fuera del
alcance de este manual).

### 2.3 Roles relevantes para cotizaciones

| Endpoint | Roles permitidos |
|---|---|
| `GET /cotizaciones` | cualquier usuario autenticado |
| `GET /cotizaciones/:id` | cualquier usuario autenticado |
| `GET /cotizaciones/:id/enlace` | `admin`, `vendedor` |
| `POST /cotizaciones` | `admin`, `vendedor`, `catalogo_web` |
| `PATCH /cotizaciones/:id` | `admin`, `vendedor` |
| `PATCH /cotizaciones/:id/cancelar` | `admin`, `vendedor` |
| `PATCH /cotizaciones/:id/confirmar` | `admin`, `vendedor` |
| `DELETE /cotizaciones/:id` | `admin`, `vendedor` |

Un agente que solo necesita **crear** cotizaciones puede operar con un usuario de rol
`vendedor` (recomendado) o `admin`. El rol `catalogo_web` solo sirve para el catálogo
público y no puede editar/cancelar/confirmar/eliminar.

## 3. Resolver los datos necesarios antes de crear la cotización

Antes de poder construir el payload de `POST /cotizaciones`, el agente necesita resolver
tres tipos de IDs a partir de la descripción en lenguaje natural del viaje: **servicios**,
opcionalmente una **lista de precios**, y opcionalmente una **moneda**.

### 3.1 Buscar servicios (`servicioId`)

No existe un endpoint de búsqueda por texto en el backend. El patrón usado por el propio
frontend (ver `frontend/src/components/buscador-servicio.tsx`) es:

```
GET /servicios?limit=500
Authorization: Bearer <token>
```

Esto devuelve un **array plano** (no envuelto en `{ data, total }`) con hasta 500
servicios de la agencia. Cada servicio tiene esta forma (ver `servicios.service.ts` /
`schema.prisma`):

```json
{
  "id": "uuid",
  "nombre": "Tour Volcán Pacaya",
  "descripcion": "...",
  "precioBase": "450.00",
  "precioCosto": "300.00",
  "monedaId": "uuid",
  "moneda": { "codigo": "GTQ", "simbolo": "Q", "tasaCambio": "1" },
  "duracionMin": 240,
  "estado": "ACTIVO" | "INACTIVO",
  "estadoPublicacion": "PUBLICO" | "PRIVADO",
  "palabrasClave": ["#pacaya", "#volcan", "#aventura"],
  "proveedorId": "uuid|null",
  "proveedor": {...},
  "tipoServicio": {...},
  "...": "..."
}
```

**Heurística de matching** (replicar la lógica del buscador del frontend):
1. Filtrar servicios con `estado === 'ACTIVO'`.
2. Buscar coincidencia por substring (case-insensitive) entre las palabras clave de la
   solicitud del cliente y `servicio.nombre`.
3. Si no hay match por nombre, comparar contra `palabrasClave` (quitando el `#` inicial
   de cada tag).
4. Si hay múltiples candidatos razonables y la entrada del cliente es ambigua, preferir
   el servicio cuyo nombre sea el match más específico/largo; si sigue ambiguo, es
   preferible pedir aclaración antes de adivinar (ej. "Pacaya" podría ser un tour de día
   completo o uno nocturno).
5. Guardar el `servicioId`, `precioBase` y `monedaId` de cada servicio resuelto — se
   necesitan para construir cada línea de la cotización.

### 3.2 Lista de precios (opcional: `listaPrecioId`)

```
GET /listas-precio/mias
Authorization: Bearer <token>
```

Devuelve las listas de precio a las que el usuario autenticado tiene acceso. Cada lista
tiene un `porcentajeAdicional` (puede ser negativo = descuento). Si no se envía
`listaPrecioId` en la cotización, cada línea usa `servicio.precioBase` tal cual (factor
1.0). Si el cliente pertenece a un segmento con tarifa especial (ej. "tarifa mayorista",
"tarifa agencia"), resolver aquí el `listaPrecioId` correspondiente por nombre.

Fórmula aplicada por el backend a cada ítem que no trae `precioUnitario` manual:
```
precioUnitario = servicio.precioBase * (1 + listaPrecio.porcentajeAdicional / 100)
```

### 3.3 Moneda de visualización (opcional: `monedaId`)

```
GET /monedas
Authorization: Bearer <token>
```

Esto es **solo para mostrar totales en una moneda común** al cliente cuando los
servicios están en monedas distintas (se convierten al vuelo vía `tasaCambio`). El
`precioUnitario` de cada línea se guarda siempre en la moneda propia del servicio — no
hay que convertir manualmente los precios antes de enviarlos. Si todos los servicios
están en la misma moneda, se puede omitir este campo.

### 3.4 Plantilla de itinerario (opcional, para viajes de varios días)

Si el cliente pide un paquete de varios días que coincide con una plantilla ya definida:

```
GET /plantillas-itinerario
GET /plantillas-itinerario/:id
```

Una plantilla trae `diasTotales` y `dias[].servicios[].servicio` con un `numeroDia`
relativo (día 1, día 2, ...) y `horaInicio`. Para usarla en una cotización, convertir
cada `numeroDia` a fecha absoluta sumando días a la `fechaServicio` elegida
(`fecha = fechaServicio + (numeroDia - 1) días`) y usar esos `servicioId`/`fecha` como
base de los `items` de la cotización (se pueden ajustar precios/cantidades después).
Esto es un atajo opcional — no es necesario para crear una cotización.

## 4. Crear la cotización

```
POST /cotizaciones
Authorization: Bearer <token>
Content-Type: application/json

{
  "cantidadPersonas": 4,
  "pasajeroResponsable": "Juan Pérez",
  "documentoResponsable": "1234567890101",
  "telefonoResponsable": "+502 5555-5555",
  "emailResponsable": "juan@example.com",
  "fechaServicio": "2026-11-20",
  "notas": "Cliente solicita guía en inglés",
  "listaPrecioId": "uuid-opcional",
  "monedaId": "uuid-opcional",
  "items": [
    {
      "servicioId": "uuid-del-servicio-1",
      "fecha": "2026-11-20",
      "cantidad": 4
    },
    {
      "servicioId": "uuid-del-servicio-2",
      "fecha": "2026-11-21",
      "precioUnitario": 120.00,
      "cantidad": 2
    }
  ]
}
```

### 4.1 Campos — reglas y valores por defecto

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `cantidadPersonas` | int ≥ 1 | sí | Total de pasajeros del grupo. |
| `pasajeroResponsable` | string | sí | Nombre completo de la persona a cuyo nombre se cotiza (no se piden nombres del resto del grupo en este nivel). |
| `fechaServicio` | date ISO (`YYYY-MM-DD`) | sí | Fecha por defecto de inicio; se usa en cada ítem que no traiga su propia `fecha`. |
| `documentoResponsable` | string | no | DPI/pasaporte. |
| `telefonoResponsable` | string | no | |
| `emailResponsable` | email | no (sí si viene del Front Office público) | |
| `notas` | string | no | Texto libre, visible en el historial/documento. |
| `listaPrecioId` | string (uuid) | no | Ver §3.2. Debe estar activa y accesible por el usuario. |
| `monedaId` | string (uuid) | no | Ver §3.3. Solo afecta presentación/totales. |
| `items` | array, mínimo 1 elemento | sí | Ver abajo. |

Cada elemento de `items`:

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `servicioId` | string (uuid) | sí | Debe pertenecer a la misma agencia del usuario. |
| `fecha` | date ISO | no | Si se omite, usa `fechaServicio` del nivel superior. Permite fechas salteadas (día 1 y día 3 sin nada el día 2). |
| `precioUnitario` | number ≥ 0 | no | Si se omite, se calcula como `precioBase * factor` (ver §3.2). Está en la moneda propia del servicio, nunca pre-convertida. |
| `cantidad` | int ≥ 1 | no | Si se omite, usa `cantidadPersonas` del nivel superior. Útil cuando un servicio aplica solo a parte del grupo. |

### 4.2 Qué hace el backend al crear

1. Resuelve/crea automáticamente un `Cliente` propio del vendedor autenticado si no
   tiene uno (`resolverClientePropio`) — el agente no necesita crear el cliente
   manualmente ni enviar `clienteId`.
2. `vendedorId` de la cotización = el usuario autenticado (`sub` del JWT). No es un
   campo del body; no se puede asignar la cotización a otro vendedor vía este endpoint.
3. Calcula `precioUnitario` por línea cuando no viene manual, aplicando el factor de la
   lista de precios.
4. Genera un código de cotización y la deja en estado `PENDIENTE`.
5. Registra una entrada en el historial: "Se creó la cotización".

### 4.3 Respuesta

Devuelve el objeto `Cotizacion` completo (con `items`, `historial`, `cliente`,
`listaPrecio`, `moneda` incluidos). Guardar el `id` devuelto para operaciones
posteriores.

## 5. Ciclo de vida posterior (opcional para el agente)

Una vez creada, la cotización queda `PENDIENTE`. Otras operaciones disponibles:

- `PATCH /cotizaciones/:id` — Actualiza campos y/o reemplaza `items` por completo
  (mismo shape que en la creación, todos los campos opcionales salvo que se quiera
  reemplazar `items`, que si se envía debe tener mínimo 1 elemento). Solo permitido
  mientras está `PENDIENTE`. Registra en el historial cada línea agregada/quitada y
  cada cambio de fecha/precio, de forma granular.
- `PATCH /cotizaciones/:id/cancelar` — pasa a `CANCELADA`.
- `PATCH /cotizaciones/:id/confirmar` — convierte la cotización en una `Reserva` real
  (tipo MULTIPLE), generando pasajeros: el responsable (con sus datos) + N-1
  acompañantes genéricos ("Acompañante 2", "Acompañante 3", ...) según
  `cantidadPersonas`, editables después desde la reserva. Pasa la cotización a
  `CONFIRMADA` y la vincula a la reserva creada (`reservaId`).
- `DELETE /cotizaciones/:id` — elimina la cotización.
- `GET /cotizaciones/:id/enlace` — genera un enlace público (token) para que el cliente
  vea la cotización sin login, útil para enviarle el detalle por WhatsApp/email.

Un agente orientado solo a "crear cotizaciones a partir de información" normalmente solo
necesita los pasos de las secciones 2–4. Las acciones de §5 son relevantes si además se
le pide confirmar, actualizar o cancelar cotizaciones existentes.

## 6. Ejemplo de flujo completo (pseudocódigo del agente)

```
1. POST /auth/login  -> accessToken
2. GET /servicios?limit=500 -> lista de servicios de la agencia
3. Para cada servicio mencionado por el cliente, resolver servicioId por nombre/palabrasClave
4. (Opcional) GET /listas-precio/mias -> resolver listaPrecioId si aplica una tarifa especial
5. (Opcional) GET /monedas -> resolver monedaId si se quiere mostrar en moneda distinta
6. Construir payload con cantidadPersonas, pasajeroResponsable, fechaServicio, items[]
7. POST /cotizaciones -> cotización creada (estado PENDIENTE), guardar id/código
8. (Opcional) GET /cotizaciones/:id/enlace -> enlace para compartir con el cliente
```

## 7. Errores comunes a manejar

- `404 Servicio no encontrado` — el `servicioId` no existe o pertenece a otra agencia.
  Re-verificar el listado de `GET /servicios` antes de reintentar.
- `400` con mensajes de validación de `class-validator` (ej. campo faltante, fecha con
  formato inválido) — revisar que las fechas vayan en ISO `YYYY-MM-DD` y los
  `servicioId`/`listaPrecioId`/`monedaId` sean strings válidos (no vacíos).
- `401 Unauthorized` — token ausente/expirado; re-autenticar con `POST /auth/login`.
- `403 Forbidden` — el rol del usuario no tiene permiso en ese endpoint (ver tabla §2.3).
