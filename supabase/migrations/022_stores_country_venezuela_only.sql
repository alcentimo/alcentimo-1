-- ============================================================
-- alcentimo-1 — Restringir país de tienda a Venezuela
-- Ejecutar en Supabase SQL Editor tras desplegar la limpieza regional.
-- ============================================================

UPDATE public.stores
SET country = 'Venezuela'
WHERE country IN ('Colombia', 'Argentina');

UPDATE public.stores
SET country = 'Venezuela'
WHERE country IS NULL;

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_country_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_country_check
  CHECK (country IS NULL OR country = 'Venezuela');

COMMENT ON COLUMN public.stores.country IS
  'País del negocio (Venezuela).';
