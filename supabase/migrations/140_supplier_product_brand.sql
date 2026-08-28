-- Marca propia del proveedor (sello en vitrinas dropship y catálogo público).
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS brand TEXT;

UPDATE public.supplier_products
SET brand = NULLIF(BTRIM(brand), '')
WHERE brand IS NOT NULL;

COMMENT ON COLUMN public.supplier_products.brand IS
  'Marca propia del mayorista (ej. Ponkesitas). Se copia al producto de tienda al importar.';
