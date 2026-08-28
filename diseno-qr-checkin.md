# Diseño del QR de Voucher y Flujo de Check-in

Continuación de `arquitectura-backend.md`. Define el contrato del JWT embebido en el QR, para que operación pueda validar un voucher sin depender de conexión constante a la base de datos.

## 1. Por qué JWT y no un simple ID

Un QR con solo el `id` de la reserva obliga a: (a) confiar ciegamente en cualquier ID que llegue, y (b) siempre golpear la base de datos para saber si es válido/vigente. Un JWT firmado por el backend permite:

- Verificar la firma **localmente** (sin red) para descartar QRs falsificados al instante.
- Incluir `exp` para que el voucher deje de ser válido automáticamente fuera de la fecha del servicio.
- Reducir la superficie de "adivinar IDs" (enumeration).

La validación final de estado (¿ya se hizo check-in? ¿fue cancelado?) sí requiere ir a base de datos — el JWT solo evita procesar QRs inválidos/expirados antes de esa consulta.

## 2. Payload del JWT

```jsonc
{
  "typ": "checkin",                    // distingue de JWTs de sesión de usuario
  "sub": "itinerarioServicio_id",      // qué servicio puntual se está validando
  "reservaId": "reserva_id",
  "agenciaId": "agencia_id",
  "iat": 1735689600,
  "exp": 1735776000                    // fecha_fin del servicio + 24h de margen
}
```

- **Firma**: `RS256` (par de llaves asimétricas) en vez de `HS256`, para poder validar el QR en un dispositivo de operación offline/edge sin exponer la llave privada que firma.
- **`sub` apunta a `ItinerarioServicio`**, no a la `Reserva` completa: un itinerario multi-día genera un voucher por reserva, pero el check-in ocurre servicio por servicio. El QR impreso/enviado es único por reserva y contiene el `reservaId`; el backend resuelve internamente cuál `ItinerarioServicio` corresponde al momento del escaneo (el más próximo en estado `PENDIENTE` para esa reserva y fecha), o se emite un QR por cada `ItinerarioServicio` si se requiere check-in independiente por día — **decisión abierta, ver sección 5**.

## 3. Ciclo de vida

```
Reserva confirmada
   │
   ▼
VouchersService.generar(reservaId)
   │ firma JWT (RS256) con payload de sección 2
   │ codifica JWT en QR (imagen PNG/SVG embebida en el voucher PDF)
   ▼
Voucher { qrUrl, pdfUrl, validoHasta }
   │
   ▼  (día del servicio, operación escanea)
POST /checkin/scan  { token: "<jwt>" }
   │
   ├─ 1. Verificar firma RS256 y exp        → si falla: 401 "QR inválido o expirado"
   ├─ 2. Buscar ItinerarioServicio por sub  → si no existe: 404
   ├─ 3. Validar estado != CANCELADO/COMPLETADO → si no: 409 "Ya operado / cancelado"
   ├─ 4. Crear CheckIn { usuarioOperacionId, fechaHora, metodo: QR }
   └─ 5. Actualizar ItinerarioServicio.estado = COMPLETADO
   ▼
200 OK { pasajero(s), servicio, hora, estado: "COMPLETADO" }
```

## 4. Endpoints

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/vouchers/:reservaId/generar` | admin, vendedor | Genera JWT + QR + PDF del voucher |
| POST | `/checkin/scan` | operacion | Valida JWT y ejecuta el check-in |
| POST | `/checkin/manual` | operacion | Check-in sin QR (busca por código de reserva), mismo flujo desde paso 2 |
| GET | `/checkin/:itinerarioServicioId` | operacion | Consulta estado actual sin hacer check-in |

## 5. Decisión abierta

**¿Un QR por reserva o un QR por día/servicio del itinerario?**
- QR único por reserva (recomendado para Fase 1): más simple para el cliente (un solo voucher), operación resuelve el servicio del día automáticamente por fecha. Menor fricción, pero requiere que el backend infiera "cuál servicio de hoy" en el escaneo.
- QR por `ItinerarioServicio`: sin ambigüedad, pero implica imprimir/enviar múltiples QRs en itinerarios de varios días — más complejo de operar en Fase 1 con una sola agencia.

Recomendación: **QR único por reserva** para Fase 1, migrando a QR por servicio si en Fase 2 aparecen itinerarios largos (5+ días) donde la resolución automática genere ambigüedad.
