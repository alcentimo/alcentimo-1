-- ============================================================
-- alcentimo-1 — Fechas de vigencia en cupones
-- ============================================================

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

ALTER TABLE coupons
  DROP CONSTRAINT IF EXISTS coupons_date_range;

ALTER TABLE coupons
  ADD CONSTRAINT coupons_date_range CHECK (
    start_date IS NULL OR end_date IS NULL OR start_date <= end_date
  );

CREATE INDEX IF NOT EXISTS idx_coupons_dates
  ON coupons (store_id, start_date, end_date)
  WHERE is_active = true;

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
  v_now TIMESTAMPTZ := now();
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

  IF v_coupon.start_date IS NOT NULL AND v_now < v_coupon.start_date THEN
    RETURN jsonb_build_object('error', 'Este cupón aún no está disponible.');
  END IF;

  IF v_coupon.end_date IS NOT NULL AND v_now > v_coupon.end_date THEN
    RETURN jsonb_build_object('error', 'Cupón expirado');
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
