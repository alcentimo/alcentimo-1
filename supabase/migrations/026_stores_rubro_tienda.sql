-- ============================================================
-- alcentimo-1 — Rubro de tienda (giro del negocio)
-- Ejecutar DESPUÉS de 025_products_stock.sql
-- La restricción CHECK se aplica en 031_store_rubro_expansion.sql
-- ============================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS rubro_tienda TEXT;

UPDATE public.stores
SET rubro_tienda = 'general'
WHERE rubro_tienda IS NULL;

ALTER TABLE public.stores
  ALTER COLUMN rubro_tienda SET DEFAULT 'general';

COMMENT ON COLUMN public.stores.rubro_tienda IS
  'Rubro del negocio; define categorías sugeridas al crear productos.';

-- Mapeo aproximado desde categorías legacy del onboarding
UPDATE public.stores s
SET rubro_tienda = mapped.rubro
FROM (
  SELECT DISTINCT ON (c.store_id)
    c.store_id,
    CASE c.slug
      WHEN 'ropa' THEN 'ropa'
      WHEN 'tecnologia' THEN 'tecnologia'
      WHEN 'comida' THEN 'general'
      WHEN 'servicios' THEN 'general'
      ELSE 'general'
    END AS rubro
  FROM public.categories c
  WHERE c.slug <> 'general'
  ORDER BY c.store_id, c.created_at ASC
) AS mapped
WHERE s.id = mapped.store_id
  AND s.rubro_tienda = 'general';
