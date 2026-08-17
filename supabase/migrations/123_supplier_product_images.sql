-- Galería de fotos de productos mayoristas (hub de proveedores).
-- image_url en supplier_products sigue siendo la portada (is_primary).

CREATE TABLE IF NOT EXISTS public.supplier_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL
    REFERENCES public.supplier_products (id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_product_images_product_idx
  ON public.supplier_product_images (supplier_product_id, sort_order, id);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_product_images_primary_uidx
  ON public.supplier_product_images (supplier_product_id)
  WHERE is_primary = true;

COMMENT ON TABLE public.supplier_product_images IS
  'Galería de fotos del producto mayorista. La portada se replica en supplier_products.image_url.';

ALTER TABLE public.supplier_product_images ENABLE ROW LEVEL SECURITY;

-- Sin policies para anon/authenticated: lectura/escritura vía service_role en server actions.

INSERT INTO public.supplier_product_images (
  supplier_product_id,
  image_url,
  sort_order,
  is_primary
)
SELECT
  p.id,
  p.image_url,
  0,
  true
FROM public.supplier_products AS p
WHERE p.image_url IS NOT NULL
  AND btrim(p.image_url) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.supplier_product_images AS i
    WHERE i.supplier_product_id = p.id
  );
