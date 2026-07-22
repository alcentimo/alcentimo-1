-- Plan Enterprise + límites de sucursales + add-on de sedes extras.

-- ============================================================
-- 1. profiles.plan admite ENTERPRISE
-- ============================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (upper(trim(plan)) IN ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'));

COMMENT ON COLUMN public.profiles.plan IS
  'Plan: FREE, PRO, BUSINESS, ENTERPRISE.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS extra_locations_authorized INTEGER NOT NULL DEFAULT 0
    CHECK (extra_locations_authorized >= 0 AND extra_locations_authorized <= 50);

COMMENT ON COLUMN public.profiles.extra_locations_authorized IS
  'Sedes adicionales autorizadas (pagadas) sobre las incluidas en el plan. Solo aplica a Enterprise.';

-- ============================================================
-- 2. plan_settings: ENTERPRISE + columnas de sucursales
-- ============================================================
ALTER TABLE public.plan_settings
  DROP CONSTRAINT IF EXISTS plan_settings_plan_key_check;

ALTER TABLE public.plan_settings
  ADD CONSTRAINT plan_settings_plan_key_check
  CHECK (plan_key IN ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'));

ALTER TABLE public.plan_settings
  ADD COLUMN IF NOT EXISTS included_locations INTEGER NOT NULL DEFAULT 1
    CHECK (included_locations >= 1 AND included_locations <= 20);

ALTER TABLE public.plan_settings
  ADD COLUMN IF NOT EXISTS extra_location_monthly_usd NUMERIC(10, 2) NOT NULL DEFAULT 0
    CHECK (extra_location_monthly_usd >= 0);

COMMENT ON COLUMN public.plan_settings.included_locations IS
  'Sucursales incluidas en el plan base.';
COMMENT ON COLUMN public.plan_settings.extra_location_monthly_usd IS
  'Precio mensual por sede adicional (add-on).';

UPDATE public.plan_settings SET included_locations = 1 WHERE plan_key IN ('FREE', 'PRO', 'BUSINESS');
UPDATE public.plan_settings SET included_locations = 3, extra_location_monthly_usd = 6
WHERE plan_key = 'ENTERPRISE';

INSERT INTO public.plan_settings (
  plan_key, display_name, monthly_usd, annual_usd, product_limit, user_limit,
  included_locations, extra_location_monthly_usd
)
VALUES (
  'ENTERPRISE', 'Enterprise', 29, 278, NULL, NULL, 3, 6
)
ON CONFLICT (plan_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_usd = COALESCE(public.plan_settings.monthly_usd, EXCLUDED.monthly_usd),
  annual_usd = COALESCE(public.plan_settings.annual_usd, EXCLUDED.annual_usd),
  product_limit = EXCLUDED.product_limit,
  included_locations = COALESCE(public.plan_settings.included_locations, EXCLUDED.included_locations),
  extra_location_monthly_usd = COALESCE(
    NULLIF(public.plan_settings.extra_location_monthly_usd, 0),
    EXCLUDED.extra_location_monthly_usd
  );

-- ============================================================
-- 3. manual_payments admite enterprise
-- ============================================================
ALTER TABLE public.manual_payments
  DROP CONSTRAINT IF EXISTS manual_payments_plan_check;

ALTER TABLE public.manual_payments
  ADD CONSTRAINT manual_payments_plan_check
  CHECK (plan_id IN ('starter', 'premium', 'enterprise'));

-- ============================================================
-- 4. Techo absoluto de sucursales (el límite de plan se aplica en app)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_store_locations_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM store_locations
  WHERE store_id = NEW.store_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Máximo 20 sucursales por tienda.';
  END IF;

  RETURN NEW;
END;
$$;
