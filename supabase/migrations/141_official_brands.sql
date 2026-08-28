-- Marcas oficiales de Alcéntimo (gestión centralizada, no las escribe el proveedor).
CREATE TABLE IF NOT EXISTS public.official_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  logo_path TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT official_brands_slug_key UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS official_brands_featured_idx
  ON public.official_brands (is_active, is_featured, sort_order, name)
  WHERE is_active = true;

COMMENT ON TABLE public.official_brands IS
  'Marcas destacadas de Alcéntimo. Nombre y logo; se asignan a SKUs mayoristas desde admin.';

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS official_brand_id UUID
    REFERENCES public.official_brands (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS supplier_products_official_brand_idx
  ON public.supplier_products (official_brand_id)
  WHERE official_brand_id IS NOT NULL;

COMMENT ON COLUMN public.supplier_products.official_brand_id IS
  'Marca oficial de Alcéntimo asignada desde el panel admin.';

COMMENT ON COLUMN public.supplier_products.brand IS
  'Copia del nombre de la marca oficial (oficial_brand_id). Solo la escribe Alcéntimo.';

ALTER TABLE public.official_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS official_brands_public_read ON public.official_brands;
CREATE POLICY official_brands_public_read
  ON public.official_brands
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
