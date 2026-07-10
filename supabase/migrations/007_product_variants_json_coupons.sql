-- ============================================================
-- alcentimo-1 — Variantes JSONB en products + cupones de descuento
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_variants ON products USING gin (variants);

-- ============================================================
-- CUPONES
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  discount_percent  NUMERIC(5, 2) NOT NULL
                    CHECK (discount_percent > 0 AND discount_percent <= 100),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  max_uses          INTEGER NOT NULL DEFAULT 0 CHECK (max_uses >= 0),
  use_count         INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT coupons_store_code_unique UNIQUE (store_id, code),
  CONSTRAINT coupons_code_format CHECK (code ~ '^[A-Za-z0-9_-]+$')
);

CREATE INDEX IF NOT EXISTS idx_coupons_store ON coupons (store_id);
CREATE INDEX IF NOT EXISTS idx_coupons_store_active ON coupons (store_id, is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
BEFORE UPDATE ON coupons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_manage_coupons" ON coupons;
DROP POLICY IF EXISTS "public_validate_coupons" ON coupons;

CREATE POLICY "members_manage_coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (is_member_of_store(store_id))
  WITH CHECK (is_member_of_store(store_id));

-- Validación pública de cupones (solo lectura de cupones activos)
CREATE POLICY "public_validate_coupons"
  ON coupons FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = coupons.store_id AND s.is_active = true
    )
  );

-- ============================================================
-- VISTAS — incluir variants JSONB
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
WHERE p.is_active = true AND c.is_active = true;

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
WHERE p.is_active = true;

GRANT SELECT ON catalog_list_view TO anon, authenticated;
GRANT SELECT ON catalog_product_detail_view TO anon, authenticated;

-- Incrementar uso de cupón al completar pedido
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_store_slug TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  SELECT c.*
  INTO v_coupon
  FROM coupons c
  JOIN stores s ON s.id = c.store_id
  WHERE s.slug = p_store_slug
    AND s.is_active = true
    AND upper(c.code) = upper(trim(p_code))
    AND c.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cupón no válido.');
  END IF;

  IF v_coupon.max_uses > 0 AND v_coupon.use_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('error', 'Este cupón ya alcanzó el límite de usos.');
  END IF;

  UPDATE coupons
  SET use_count = use_count + 1
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_coupon(TEXT, TEXT) TO anon, authenticated;
