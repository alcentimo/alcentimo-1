-- Interruptor de catálogo por proveedor: si está apagado, ningún producto
-- debe aparecer a dropshippers ni en vitrinas públicas.

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS catalog_visible BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.supplier_products.catalog_visible IS
  'Visibilidad del catálogo del proveedor. false = oculto para dropshippers y catálogos públicos.';

CREATE TABLE IF NOT EXISTS public.supplier_catalog_visibility (
  supplier_user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  catalog_visible BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.supplier_catalog_visibility IS
  'Interruptor maestro del catálogo mayorista. false oculta todos los productos de ese proveedor.';

ALTER TABLE public.supplier_catalog_visibility ENABLE ROW LEVEL SECURITY;

-- Productos que ya estaban publicados siguen visibles hasta que un admin los oculte.
UPDATE public.supplier_products
SET catalog_visible = true
WHERE is_active = true
  AND COALESCE(publication_status, 'draft') = 'published'
  AND precio_mayorista IS NOT NULL;

INSERT INTO public.supplier_catalog_visibility (supplier_user_id, catalog_visible, updated_at)
SELECT created_by, true, now()
FROM public.supplier_products
WHERE catalog_visible = true
GROUP BY created_by
ON CONFLICT (supplier_user_id) DO UPDATE
SET catalog_visible = EXCLUDED.catalog_visible,
    updated_at = now();

CREATE INDEX IF NOT EXISTS supplier_products_dropship_visible_idx
  ON public.supplier_products (is_active, catalog_visible, publication_status, created_at DESC)
  WHERE is_active = true
    AND catalog_visible = true
    AND publication_status = 'published';

CREATE OR REPLACE VIEW public.dropship_visible_supplier_products AS
SELECT sp.*
FROM public.supplier_products sp
WHERE sp.is_active = true
  AND sp.catalog_visible = true
  AND sp.publication_status = 'published'
  AND sp.precio_mayorista IS NOT NULL;

COMMENT ON VIEW public.dropship_visible_supplier_products IS
  'Única proyección segura para listados dropshipper / vitrina pública.';
