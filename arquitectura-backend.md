# Arquitectura Backend — NestJS (Fase 1)

Continuación de `modelo-datos.md` y `schema.prisma`.

## 1. Estructura de carpetas

```
src/
├── main.ts
├── app.module.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts        # PrismaClient inyectable, con hooks onModuleInit/Destroy
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts       # valida rol contra @Roles() decorator
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── interceptors/
│   │   └── tenant.interceptor.ts  # inyecta agenciaId del JWT en el request
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── dto/
│       └── pagination.dto.ts
│
├── auth/                         # login, JWT, refresh token
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── strategies/jwt.strategy.ts
│
├── modules/
│   │
│   ├── comercial/                # ventas: reservas, clientes, pasajeros, voucher
│   │   ├── reservas/
│   │   │   ├── reservas.module.ts
│   │   │   ├── reservas.controller.ts
│   │   │   ├── reservas.service.ts
│   │   │   └── dto/
│   │   ├── clientes/
│   │   └── vouchers/              # generación PDF + QR
│   │
│   ├── operacion/                 # itinerarios, check-in
│   │   ├── itinerarios/
│   │   │   ├── itinerarios.module.ts
│   │   │   ├── itinerarios.service.ts   # genera Itinerario "congelado" desde plantilla
│   │   │   └── itinerarios.controller.ts
│   │   └── checkin/
│   │       ├── checkin.module.ts
│   │       ├── checkin.controller.ts    # POST /checkin/:qrToken
│   │       └── checkin.service.ts       # valida JWT del QR y marca ItinerarioServicio
│   │
│   ├── finanzas/                  # pagos, liquidaciones
│   │   ├── pagos/
│   │   └── liquidaciones/
│   │
│   └── mantenedores/               # CRUDs de catálogo, todos con guard de rol admin
│       ├── agencias/
│       ├── usuarios/
│       ├── proveedores/
│       ├── vendedores/            # vista filtrada de usuarios (rol=vendedor)
│       ├── servicios/
│       ├── tipos-servicio/
│       ├── plantillas-itinerario/
│       ├── vehiculos/
│       ├── guias/
│       ├── rutas/
│       ├── puntos-recogida/
│       ├── monedas/
│       ├── impuestos/
│       └── formas-pago/
│
└── dashboard/                     # endpoints agregados de KPIs (lectura, sin CRUD)
    ├── dashboard.module.ts
    ├── dashboard.controller.ts    # GET /dashboard/comercial, /operacion, /finanzas
    └── dashboard.service.ts
```

## 2. Convenciones

- **Multi-tenant por interceptor**: `TenantInterceptor` lee `agenciaId` del JWT y lo inyecta en `request.agenciaId`. Todos los `service.ts` reciben `agenciaId` como primer parámetro y lo usan en el `where` de Prisma — nunca se confía en el `agenciaId` que venga en el body/params.
- **DTOs con `class-validator`**: un `create-*.dto.ts` y `update-*.dto.ts` (extiende `PartialType`) por recurso.
- **Guards**: `JwtAuthGuard` global (via `APP_GUARD`), `RolesGuard` + `@Roles('admin','operacion')` por endpoint.
- **Módulos de mantenedores**: comparten un `CrudService<T>` genérico (base class) para no repetir `findAll/findOne/create/update/remove` en cada uno — única abstracción compartida, justificada porque son 13 mantenedores casi idénticos.
- **Transacciones**: creación de Reserva + Itinerario (copiado desde plantilla) + Voucher se hace dentro de `prisma.$transaction(...)` en `reservas.service.ts`, para garantizar atomicidad.

## 3. Flujo end-to-end mapeado a módulos

1. `auth` → login del vendedor, retorna JWT con `{ userId, agenciaId, rol }`.
2. `comercial/reservas.service.create()`:
   - Crea `Reserva`.
   - Si viene `plantillaItinerarioId`, clona `PlantillaItinerarioDia` + `PlantillaItinerarioServicio` hacia `Itinerario` + `ItinerarioDia` + `ItinerarioServicio` (fechas reales según `fechaServicioInicio`).
   - Genera `Voucher` con QR (JWT corto firmado, ver siguiente doc).
3. `operacion/itinerarios` → operación consulta itinerarios del día (`GET /itinerarios?fecha=...`).
4. `operacion/checkin.service.checkin(qrToken)` → decodifica JWT del QR, valida `itinerarioServicioId`, crea `CheckIn`, cambia estado a `COMPLETADO`.
5. `finanzas/liquidaciones` → agrupa `ItinerarioServicio` en estado `COMPLETADO` por proveedor y periodo para generar `Liquidacion`.
6. `dashboard` → agrega counts/sumas desde los tres módulos (queries de solo lectura, sin lógica de negocio).

## 4. Próximo paso

Diseño del payload y ciclo de vida del **JWT del QR** (voucher → check-in), incluyendo expiración, firma y validación offline.
