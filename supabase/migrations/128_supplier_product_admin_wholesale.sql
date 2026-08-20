-- Control de márgenes admin: costo interno vs precio visible para dropshippers.
-- base_price_usd = costo_proveedor (interno). precio_mayorista lo define Alcéntimo.
-- Los productos nuevos entran en draft hasta que un admin publique.

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS precio_mayorista NUMERIC(12, 2)
    CHECK (precio_mayorista IS NULL OR precio_mayorista >= 0);

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'supplier_products_publication_status_check'
  ) THEN
    ALTER TABLE public.supplier_products
      ADD CONSTRAINT supplier_products_publication_status_check
      CHECK (publication_status IN ('draft', 'published'));
  END IF;
END
$$;

COMMENT ON COLUMN public.supplier_products.base_price_usd IS
  'costo_proveedor: costo interno del proveedor. Nunca se muestra a dropshippers.';

COMMENT ON COLUMN public.supplier_products.precio_mayorista IS
  'Precio visible en el catálogo de dropshippers. Lo define un admin antes de publicar.';

COMMENT ON COLUMN public.supplier_products.publication_status IS
  'draft: pendiente de precio_mayorista y revisión admin. published: visible para dropshippers.';

-- Catálogo vigente: conservar visibilidad con el precio actual como mayorista.
UPDATE public.supplier_products
SET
  precio_mayorista = COALESCE(precio_mayorista, base_price_usd),
  publication_status = 'published'
WHERE is_active = true
  AND COALESCE(precio_mayorista, base_price_usd) IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_products_published_idx
  ON public.supplier_products (is_active, publication_status, created_at DESC)
  WHERE is_active = true AND publication_status = 'published';

CREATE INDEX IF NOT EXISTS supplier_products_draft_idx
  ON public.supplier_products (publication_status, created_at DESC)
  WHERE publication_status = 'draft' AND is_active = true;
