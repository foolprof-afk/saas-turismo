# Sistema SaaS para Agencias de Turismo

Plataforma para que agencias administren reservas, itinerarios, operación, proveedores y
liquidaciones. Ver el documento maestro de alcance en `modelo-datos.md`,
`arquitectura-backend.md` y `diseno-qr-checkin.md`.

## Estructura del repositorio

```
saas-turismo/
├── modelo-datos.md            # Diagrama ER y entidades del dominio
├── arquitectura-backend.md    # Estructura de módulos NestJS
├── diseno-qr-checkin.md       # Contrato del JWT del QR y flujo de check-in
├── docker-compose.yml         # Orquesta postgres + backend + frontend
├── backend/                   # API NestJS + Prisma (PostgreSQL)
└── frontend/                  # Next.js (App Router) + TypeScript
```

## Arranque rápido con Docker

```bash
cp backend/.env.example backend/.env   # ajustar JWT_SECRET
docker compose up --build
```

- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- Postgres: localhost:5432 (usuario/clave `saas_turismo`)

Después de levantar los contenedores, corre las migraciones y el seed una vez:

```bash
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
```

Login de prueba: `admin@demo.com` / `admin123`.

## Arranque manual (sin Docker)

Ver `backend/README.md` para el backend. Para el frontend:

```bash
cd frontend
npm install
cp .env.example .env   # NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev
```

## Estado del proyecto (Fase 1)

- [x] Modelo de datos y `schema.prisma`
- [x] Backend NestJS: auth, 13 mantenedores, reservas + voucher/QR, check-in, itinerarios,
      pagos, liquidaciones, dashboard — build verificado sin errores de tipado
- [x] Frontend Next.js: login, dashboard, reservas (listado/creación/detalle con voucher),
      operación (agenda del día + check-in manual) — build verificado
- [x] `docker-compose.yml` con Postgres, backend y frontend
- [ ] **Sin probar end-to-end contra una base de datos real** — este entorno no tiene Docker
      ni PostgreSQL instalados, así que las migraciones (`prisma migrate dev`) y el flujo
      completo (login → reserva → voucher → check-in) no se ejecutaron en vivo. Verificarlo
      es el primer paso recomendado antes de seguir avanzando.
- [ ] Generación de PDF del voucher (por ahora solo se genera el QR como imagen embebida)
- [ ] Aislamiento multi-tenant reforzado (RLS de Postgres) — pendiente para Fase 2
