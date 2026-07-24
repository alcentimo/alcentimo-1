-- Totales de stock en catalog_list_view: sumar todas las variantes activas
-- (el join de la variante default dejaba available_stock en 0 con variantes de venta).
DROP VIEW IF EXISTS catalog_list_view CASCADE;

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
  p.sort_order,
  p.created_at,
  p.updated_at,
  p.variants                                    AS product_variants,
  p.metadata,
  c.id                                          AS category_id,
  c.name                                        AS category_name,
  c.slug                                        AS category_slug,
  c.path                                        AS category_path,
  v.id                                          AS default_variant_id,
  v.sku                                         AS default_sku,
  (
    SELECT COALESCE(SUM(vs.stock_quantity), 0)
    FROM product_variants vs
    WHERE vs.product_id = p.id AND vs.is_active = true
  )                                             AS stock_quantity,
  (
    SELECT COALESCE(SUM(vs.reserved_quantity), 0)
    FROM product_variants vs
    WHERE vs.product_id = p.id AND vs.is_active = true
  )                                             AS reserved_quantity,
  (
    SELECT COALESCE(
      SUM(GREATEST(vs.stock_quantity - vs.reserved_quantity, 0)),
      0
    )
    FROM product_variants vs
    WHERE vs.product_id = p.id AND vs.is_active = true
  )                                             AS available_stock,
  v.low_stock_threshold,
  v.attributes                                  AS default_attributes,
  pp.amount_usd                                 AS price_usd,
  price_in_ves(pp.amount_usd)                   AS price_ves,
  pp.compare_at_usd                             AS compare_at_usd,
  price_in_ves(pp.compare_at_usd)               AS compare_at_ves,
  pp.wholesale_price_usd                        AS wholesale_price_usd,
  pp.wholesale_min_qty                          AS wholesale_min_qty,
  get_current_exchange_rate()                   AS exchange_rate_used,
  img.thumb_url,
  img.blur_hash,
  img.alt_text                                  AS image_alt,
  (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'thumb_url', pi.thumb_url,
          'sort_order', pi.sort_order,
          'is_primary', pi.is_primary
        )
        ORDER BY pi.is_primary DESC, pi.sort_order, pi.id
      ),
      '[]'::jsonb
    )
    FROM product_images pi
    WHERE pi.product_id = p.id
  )                                             AS gallery_images
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

GRANT SELECT ON catalog_list_view TO anon, authenticated;
