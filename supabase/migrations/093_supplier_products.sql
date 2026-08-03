-- Productos del hub oculto de proveedores / mayoristas (no catálogo público).
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  base_price_usd NUMERIC(12, 2) NOT NULL CHECK (base_price_usd >= 0),
  image_url TEXT,
  image_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_products_created_by_idx
  ON public.supplier_products (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS supplier_products_active_idx
  ON public.supplier_products (is_active, created_at DESC)
  WHERE is_active = true;

COMMENT ON TABLE public.supplier_products IS
  'Catálogo interno de proveedores/mayoristas. No se publica en el storefront.';

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- Sin policies para anon/authenticated: solo service_role (acciones server) escribe/lee.
