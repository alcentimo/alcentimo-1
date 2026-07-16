-- ============================================================
-- alcentimo-1 — Borrado lógico de productos
-- Preserva historial en ventas (FK producto_id RESTRICT)
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_deleted IS
  'Borrado lógico: el producto no aparece en inventario ni catálogo público.';

CREATE INDEX IF NOT EXISTS idx_products_store_not_deleted
  ON public.products (store_id, updated_at DESC)
  WHERE is_deleted = false AND is_active = true;

-- ============================================================
-- VISTAS — excluir productos eliminados
-- ============================================================
DROP VIEW IF EXISTS catalog_list_view CASCADE;
DROP VIEW IF EXISTS catalog_product_detail_view CASCADE;

CREATE VIEW catalog_list_view AS
SELECT
  s.id                                          AS store_id,
  s.slug                                        AS store_slug,
  s.name                                        AS store_name,
  p.id                                          AS product_id,
  p.slug                                        AS product_slug,
  p.name                                        AS product_name,
  p.short_description,
  p.brand,
  p.is_featured,
  p.updated_at,
  p.variants                                    AS product_variants,
  c.id                                          AS category_id,
  c.name                                        AS category_name,
  c.slug                                        AS category_slug,
  c.path                                        AS category_path,
  v.id                                          AS default_variant_id,
  v.sku                                         AS default_sku,
  v.stock_quantity,
  v.reserved_quantity,
  (v.stock_quantity - v.reserved_quantity)       AS available_stock,
  v.low_stock_threshold,
  v.attributes                                  AS default_attributes,
  pp.amount_usd                                 AS price_usd,
  price_in_ves(pp.amount_usd)                   AS price_ves,
  pp.compare_at_usd                             AS compare_at_usd,
  price_in_ves(pp.compare_at_usd)               AS compare_at_ves,
  get_current_exchange_rate()                   AS exchange_rate_used,
  img.thumb_url,
  img.blur_hash,
  img.alt_text                                  AS image_alt
FROM products p
JOIN stores s     ON s.id = p.store_id AND s.is_active = true
JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
JOIN product_variants v
  ON v.product_id = p.id AND v.is_default = true AND v.is_active = true
LEFT JOIN product_prices pp
  ON pp.variant_id = v.id AND pp.effective_until IS NULL
LEFT JOIN product_images img
  ON img.product_id = p.id AND img.is_primary = true
WHERE p.is_active = true
  AND p.is_deleted = false
  AND c.is_active = true;

CREATE VIEW catalog_product_detail_view AS
SELECT
  s.id   AS store_id,
  s.slug AS store_slug,
  s.name AS store_name,
  p.id,
  p.slug,
  p.name,
  p.description,
  p.short_description,
  p.brand,
  p.tags,
  p.is_featured,
  p.metadata,
  p.variants AS product_variants,
  p.updated_at,
  c.id   AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.path AS category_path,
  get_current_exchange_rate() AS exchange_rate_used,
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', v.id,
      'sku', v.sku,
      'name', v.name,
      'attributes', v.attributes,
      'stock_quantity', v.stock_quantity,
      'reserved_quantity', v.reserved_quantity,
      'available_stock', v.stock_quantity - v.reserved_quantity,
      'low_stock_threshold', v.low_stock_threshold,
      'is_default', v.is_default,
      'price_usd', pp.amount_usd,
      'price_ves', price_in_ves(pp.amount_usd),
      'compare_at_usd', pp.compare_at_usd,
      'compare_at_ves', price_in_ves(pp.compare_at_usd)
    ) ORDER BY v.is_default DESC, v.sku), '[]'::jsonb)
    FROM product_variants v
    LEFT JOIN product_prices pp
      ON pp.variant_id = v.id AND pp.effective_until IS NULL
    WHERE v.product_id = p.id AND v.is_active = true
  ) AS variants,
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', pi.id,
      'thumb_url', pi.thumb_url,
      'medium_url', pi.medium_url,
      'full_url', pi.full_url,
      'blur_hash', pi.blur_hash,
      'sort_order', pi.sort_order,
      'is_primary', pi.is_primary
    ) ORDER BY pi.sort_order), '[]'::jsonb)
    FROM product_images pi
    WHERE pi.product_id = p.id
  ) AS images
FROM products p
JOIN stores s     ON s.id = p.store_id AND s.is_active = true
JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
WHERE p.is_active = true
  AND p.is_deleted = false;

GRANT SELECT ON catalog_list_view TO anon, authenticated;
GRANT SELECT ON catalog_product_detail_view TO anon, authenticated;
