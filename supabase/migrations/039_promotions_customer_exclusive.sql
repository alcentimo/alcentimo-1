-- ============================================================
-- alcentimo-1 — Promociones exclusivas para clientes registrados
-- Ejecutar DESPUÉS de 038_customer_merchant_notes.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  discount_percentage NUMERIC(5, 2) NOT NULL
                      CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  code                TEXT NOT NULL,
  start_date          TIMESTAMPTZ,
  end_date            TIMESTAMPTZ NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  auto_apply          BOOLEAN NOT NULL DEFAULT true,
  max_uses            INTEGER NOT NULL DEFAULT 0 CHECK (max_uses >= 0),
  use_count           INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT promotions_store_code_unique UNIQUE (store_id, code),
  CONSTRAINT promotions_code_format CHECK (code ~ '^[A-Za-z0-9_-]+$')
);

CREATE INDEX IF NOT EXISTS idx_promotions_store
  ON public.promotions (store_id);

CREATE INDEX IF NOT EXISTS idx_promotions_store_active
  ON public.promotions (store_id, is_active)
  WHERE is_active = true;

COMMENT ON TABLE public.promotions IS
  'Promociones exclusivas para clientes con perfil en customer_profiles.';

DROP TRIGGER IF EXISTS promotions_set_updated_at ON public.promotions;
CREATE TRIGGER promotions_set_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotions_members_manage ON public.promotions;
CREATE POLICY promotions_members_manage
  ON public.promotions
  FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS promotions_public_read_active ON public.promotions;
CREATE POLICY promotions_public_read_active
  ON public.promotions
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = store_id
        AND s.is_active = true
    )
  );

-- Valida promoción y exige customer_profiles cuando hay user autenticado.
CREATE OR REPLACE FUNCTION public.validate_customer_promotion(
  p_store_slug TEXT,
  p_code TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_promo promotions%ROWTYPE;
BEGIN
  SELECT s.id INTO v_store_id
  FROM stores s
  WHERE s.slug = lower(trim(p_store_slug))
    AND s.is_active = true
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Tienda no encontrada.');
  END IF;

  SELECT * INTO v_promo
  FROM promotions p
  WHERE p.store_id = v_store_id
    AND p.is_active = true
    AND upper(trim(p.code)) = upper(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Promoción no válida o inactiva.');
  END IF;

  IF v_promo.start_date IS NOT NULL AND v_promo.start_date > now() THEN
    RETURN jsonb_build_object('error', 'Esta promoción aún no está disponible.');
  END IF;

  IF v_promo.end_date IS NOT NULL AND v_promo.end_date < now() THEN
    RETURN jsonb_build_object('error', 'Promoción expirada.');
  END IF;

  IF v_promo.max_uses > 0 AND v_promo.use_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('error', 'Esta promoción alcanzó el límite de usos.');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Debes registrarte como cliente para usar esta promoción.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM customer_profiles cp
    WHERE cp.store_id = v_store_id
      AND cp.user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('error', 'Esta promoción es exclusiva para clientes registrados de la tienda.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', v_promo.code,
    'name', v_promo.name,
    'discount_percentage', v_promo.discount_percentage
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_customer_promotion(
  p_store_slug TEXT,
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation JSONB;
  v_store_id UUID;
BEGIN
  v_validation := public.validate_customer_promotion(p_store_slug, p_code, p_user_id);

  IF v_validation ? 'error' THEN
    RETURN v_validation;
  END IF;

  SELECT s.id INTO v_store_id
  FROM stores s
  WHERE s.slug = lower(trim(p_store_slug))
    AND s.is_active = true
  LIMIT 1;

  UPDATE promotions p
  SET use_count = use_count + 1,
      updated_at = now()
  WHERE p.store_id = v_store_id
    AND upper(trim(p.code)) = upper(trim(p_code))
    AND p.is_active = true;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_customer_promotion(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_customer_promotion(TEXT, TEXT, UUID) TO authenticated;
