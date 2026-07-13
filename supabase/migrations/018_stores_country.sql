-- ============================================================
-- alcentimo-1 — País de la tienda (onboarding)
-- Ejecutar en Supabase SQL Editor antes de desplegar el cambio de código.
-- ============================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_country_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_country_check
  CHECK (country IS NULL OR country IN ('Venezuela', 'Colombia', 'Argentina'));

COMMENT ON COLUMN public.stores.country IS
  'País del negocio seleccionado en onboarding (Venezuela, Colombia, Argentina).';
