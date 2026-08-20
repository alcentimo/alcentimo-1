-- Visibilidad individual por SKU, independiente del interruptor del proveedor.
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.supplier_products.is_visible IS
  'Visibilidad individual para dropshippers. false oculta este producto aunque el catálogo del proveedor esté publicado.';

CREATE INDEX IF NOT EXISTS supplier_products_dropship_listed_idx
  ON public.supplier_products (
    is_active,
    catalog_visible,
    is_visible,
    publication_status,
    created_at DESC
  )
  WHERE is_active = true
    AND catalog_visible = true
    AND is_visible = true
    AND publication_status = 'published';

CREATE OR REPLACE VIEW public.dropship_visible_supplier_products AS
SELECT sp.*
FROM public.supplier_products sp
WHERE sp.is_active = true
  AND sp.catalog_visible = true
  AND sp.is_visible = true
  AND sp.publication_status = 'published'
  AND sp.precio_mayorista IS NOT NULL;

COMMENT ON VIEW public.dropship_visible_supplier_products IS
  'Única proyección segura para listados dropshipper / vitrina pública.';
