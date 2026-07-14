-- ============================================================
-- alcentimo-1 — Columna stock en products (cache del inventario)
-- Ejecutar DESPUÉS de 024_payment_reports.sql
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0
  CHECK (stock >= 0);

COMMENT ON COLUMN public.products.stock IS
  'Stock disponible del producto (sincronizado con la variante por defecto).';

-- Backfill desde la variante default
UPDATE public.products p
SET stock = COALESCE(src.stock_quantity, 0)
FROM (
  SELECT product_id, stock_quantity
  FROM public.product_variants
  WHERE is_default = true AND is_active = true
) AS src
WHERE p.id = src.product_id;

CREATE OR REPLACE FUNCTION public.sync_product_stock_from_default_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default IS TRUE THEN
    UPDATE public.products
    SET stock = GREATEST(NEW.stock_quantity, 0),
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_variant_stock_sync ON public.product_variants;
CREATE TRIGGER product_variant_stock_sync
  AFTER INSERT OR UPDATE OF stock_quantity, is_default
  ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_stock_from_default_variant();
