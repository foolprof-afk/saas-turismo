-- Backfill manual para el cambio de CotizacionItem.dia (Int relativo) a CotizacionItem.fecha
-- (DateTime). Este proyecto sincroniza el esquema con `prisma db push` (no usa
-- `prisma migrate`), así que este script se corre a mano, en este orden exacto, ANTES de
-- `npx prisma db push` con el schema.prisma ya actualizado:
--
--   1. Correr este script completo contra la base de datos (agrega "fecha" como nullable,
--      la calcula a partir de "dia" para todas las filas existentes).
--   2. Confirmar con el SELECT de verificación al final que no quedó ninguna fila con
--      fecha NULL.
--   3. Correr `npx prisma db push` (ahora sí podrá marcar "fecha" como NOT NULL y eliminar
--      la columna "dia", porque ya no hay datos que perder).
--
-- No se ejecuta automáticamente: requiere confirmación explícita antes de correr contra la
-- base de datos de producción (ver guardrail de escritura en producción).

BEGIN;

ALTER TABLE cotizacion_items ADD COLUMN IF NOT EXISTS fecha DATE;

UPDATE cotizacion_items ci
SET fecha = (c."fechaServicio"::date + ((ci.dia - 1) || ' days')::interval)::date
FROM cotizaciones c
WHERE c.id = ci."cotizacionId"
  AND ci.fecha IS NULL;

-- Verificación: debe devolver 0 filas antes de seguir con `prisma db push`.
SELECT count(*) AS filas_sin_fecha FROM cotizacion_items WHERE fecha IS NULL;

COMMIT;
