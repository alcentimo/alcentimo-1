-- ============================================================
-- alcentimo-1 — Persistir modificadores en carrito de cliente
-- Ejecutar DESPUÉS de 082_bcv_sync_extra_slots.sql
-- ============================================================

ALTER TABLE public.customer_cart_items
  ADD COLUMN IF NOT EXISTS modifiers_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.customer_cart_items
  ADD COLUMN IF NOT EXISTS line_key text;

UPDATE public.customer_cart_items
SET line_key = product_id::text || ':' || variant_id
WHERE line_key IS NULL OR btrim(line_key) = '';

ALTER TABLE public.customer_cart_items
  ALTER COLUMN line_key SET NOT NULL;

ALTER TABLE public.customer_cart_items
  DROP CONSTRAINT IF EXISTS customer_cart_items_user_store_product_variant_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_cart_items_user_store_line_key_unique'
  ) THEN
    ALTER TABLE public.customer_cart_items
      ADD CONSTRAINT customer_cart_items_user_store_line_key_unique
      UNIQUE (user_id, store_id, line_key);
  END IF;
END $$;

COMMENT ON COLUMN public.customer_cart_items.modifiers_json IS
  'Selección de modificadores del ítem (alimentos, extras, etc.).';

COMMENT ON COLUMN public.customer_cart_items.line_key IS
  'Clave estable product:variant[:modifiers] para unicidad por línea del carrito.';
