-- Precio de venta sugerido por Alcéntimo para dropshippers (importación masiva).
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS suggested_retail_usd NUMERIC(12, 2)
    CHECK (suggested_retail_usd IS NULL OR suggested_retail_usd > 0);

COMMENT ON COLUMN public.supplier_products.suggested_retail_usd IS
  'Precio de venta sugerido por Alcéntimo para dropshippers. Se aplica al cargar productos si el comerciante no fijó uno propio.';
