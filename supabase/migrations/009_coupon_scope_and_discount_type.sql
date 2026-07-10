-- ============================================================
-- alcentimo-1 — Alcance y tipo de descuento en cupones
-- ============================================================

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS discount_fixed_usd NUMERIC(12, 2);

ALTER TABLE coupons
  DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

ALTER TABLE coupons
  ADD CONSTRAINT coupons_discount_type_check
  CHECK (discount_type IN ('percent', 'fixed'));

ALTER TABLE coupons
  DROP CONSTRAINT IF EXISTS coupons_discount_type_value;

ALTER TABLE coupons
  ADD CONSTRAINT coupons_discount_type_value CHECK (
    (
      discount_type = 'percent'
      AND discount_percent > 0
      AND discount_percent <= 100
    )
    OR (
      discount_type = 'fixed'
      AND discount_fixed_usd IS NOT NULL
      AND discount_fixed_usd > 0
    )
  );

ALTER TABLE coupons
  DROP CONSTRAINT IF EXISTS coupons_scope_products;

ALTER TABLE coupons
  ADD CONSTRAINT coupons_scope_products CHECK (
    (is_global = true AND cardinality(product_ids) = 0)
    OR (is_global = false AND cardinality(product_ids) > 0)
  );

CREATE INDEX IF NOT EXISTS idx_coupons_product_ids
  ON coupons USING gin (product_ids);
