# Backend — Sistema SaaS para Agencias de Turismo (Fase 1)

## Requisitos

- Node.js 18+
- PostgreSQL (local o Docker)

## Arranque

```bash
npm install
cp .env.example .env      # completar DATABASE_URL y JWT_SECRET
npx prisma migrate dev    # crea las tablas en PostgreSQL
npx prisma db seed        # crea agencia "demo" + usuario admin@demo.com / admin123
npm run start:dev
```

El servidor queda en `http://localhost:3000`.

## Flujo de prueba end-to-end

```bash
# 1. Login
curl -X POST localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}'
# -> guarda el accessToken

# 2. Crear un TipoServicio, Proveedor, Moneda, FormaPago, Servicio (mantenedores, rol admin)
# 3. Crear un Cliente
# 4. Crear una Reserva (rol admin o vendedor) -> genera Itinerario + Voucher + QR automáticamente
# 5. Operación: GET /itinerarios?fecha=YYYY-MM-DD para ver la agenda del día
# 6. Operación: POST /checkin/scan { "token": "<jwt del QR>" } para marcar el check-in
```

## Estructura

Ver `../arquitectura-backend.md` para el detalle de módulos, y `../diseno-qr-checkin.md`
para el contrato del JWT del QR.

## Notas de la Fase 1

- Multi-tenant listo desde el modelo de datos (`agenciaId` en casi todas las tablas), pero
  el aislamiento real (RLS o row filtering estricto por request) se refuerza en Fase 2.
- Las llaves RSA del JWT del QR se autogeneran en `./keys/` la primera vez que arranca el
  servidor (`QrTokenService.onModuleInit`). En producción, generarlas una vez y fijarlas
  vía las variables `QR_JWT_PRIVATE_KEY_PATH` / `QR_JWT_PUBLIC_KEY_PATH`.
- El voucher genera el QR como imagen `data:` embebida (`qrUrl`); la generación de PDF
  del voucher queda pendiente de integrar (candidato: skill de `pdf`).
