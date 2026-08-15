-- Dropshipping puro: oculta productos de tienda que no vienen del hub mayorista.
-- El catálogo público y el panel solo muestran filas con store_dropship_links.

UPDATE public.products AS p
SET
  is_active = false,
  is_deleted = true,
  updated_at = now()
WHERE COALESCE(p.is_deleted, false) = false
  AND COALESCE(p.is_active, true) = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.store_dropship_links AS l
    WHERE l.product_id = p.id
  );

COMMENT ON TABLE public.store_dropship_links IS
  'Relación dropshipping: producto del comerciante abastecido por un SKU mayorista. En modo puro, el catálogo de la tienda solo incluye productos con este vínculo.';
