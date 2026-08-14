-- Marketplace UX: precio de lista (tachado) y envío gratis en catálogo mayorista.
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS compare_at_usd NUMERIC(12, 2)
    CHECK (compare_at_usd IS NULL OR compare_at_usd >= 0);

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS supplier_products_free_shipping_idx
  ON public.supplier_products (free_shipping, is_active, created_at DESC)
  WHERE is_active = true AND free_shipping = true;

COMMENT ON COLUMN public.supplier_products.compare_at_usd IS
  'Precio de lista / anterior (USD) para mostrar descuento en vitrina. NULL = sin tachado.';

COMMENT ON COLUMN public.supplier_products.free_shipping IS
  'Si true, el producto se promociona con etiqueta Envío gratis en el marketplace.';
