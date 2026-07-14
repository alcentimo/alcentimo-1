-- ============================================================
-- alcentimo-1 — Rubro de tienda (giro del negocio)
-- Ejecutar DESPUÉS de 025_products_stock.sql
-- ============================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS rubro_tienda TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_rubro_tienda_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_rubro_tienda_check
  CHECK (
    rubro_tienda IN (
      'ropa',
      'zapateria',
      'joyeria',
      'cosmeticos',
      'tecnologia',
      'repuestos',
      'general'
    )
  );

COMMENT ON COLUMN public.stores.rubro_tienda IS
  'Giro o rubro del negocio; define categorías de producto en el dashboard.';

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
