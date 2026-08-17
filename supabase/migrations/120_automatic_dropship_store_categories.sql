-- Categorías del catálogo público: automáticas desde Mercado Oculto.
-- Ya no hay gestión manual (ocultar/mostrar), así que reactivamos filas
-- para que productos vinculados a categorías ocultas vuelvan al catálogo.

UPDATE public.categories
SET
  is_active = true,
  updated_at = now()
WHERE is_active IS DISTINCT FROM true;

COMMENT ON TABLE public.categories IS
  'Categorías de producto por tienda. En dropshipping puro el catálogo público deriva las píldoras de las categorías de supplier_products vinculados; esta tabla cubre el FK de products.category_id.';
