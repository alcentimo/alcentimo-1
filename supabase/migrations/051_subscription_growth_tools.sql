-- Cupones, campañas y otorgamientos de plan de suscripción (panel admin / crecimiento).

-- Cupones de suscripción (descuento o regalo de días Pro)
CREATE TABLE IF NOT EXISTS public.subscription_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  reward_type TEXT NOT NULL
    CHECK (reward_type IN ('percent_discount', 'fixed_discount', 'grant_pro_days')),
  discount_percent NUMERIC(5, 2) NULL
    CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100)),
  discount_usd NUMERIC(10, 2) NULL
    CHECK (discount_usd IS NULL OR discount_usd > 0),
  grant_pro_days INTEGER NULL
    CHECK (grant_pro_days IS NULL OR grant_pro_days > 0),
  max_redemptions INTEGER NULL
    CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0
    CHECK (redemption_count >= 0),
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_coupons_code_upper CHECK (code = upper(code)),
  CONSTRAINT subscription_coupons_reward_fields CHECK (
    (reward_type = 'percent_discount' AND discount_percent IS NOT NULL)
    OR (reward_type = 'fixed_discount' AND discount_usd IS NOT NULL)
    OR (reward_type = 'grant_pro_days' AND grant_pro_days IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_coupons_code
  ON public.subscription_coupons (code);

COMMENT ON TABLE public.subscription_coupons IS
  'Códigos de promoción de planes SaaS (descuento o días Pro).';

-- Redenciones (1 por usuario y cupón)
CREATE TABLE IF NOT EXISTS public.subscription_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.subscription_coupons (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reward_snapshot TEXT NOT NULL,
  manual_payment_id UUID NULL REFERENCES public.manual_payments (id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_coupon_redemptions_user
  ON public.subscription_coupon_redemptions (user_id, redeemed_at DESC);

-- Campañas temporales (descuento automático por fechas)
CREATE TABLE IF NOT EXISTS public.subscription_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  discount_percent NUMERIC(5, 2) NULL
    CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100)),
  discount_usd NUMERIC(10, 2) NULL
    CHECK (discount_usd IS NULL OR discount_usd > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to_plans TEXT[] NOT NULL DEFAULT ARRAY['PRO', 'BUSINESS'],
  created_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_campaigns_dates CHECK (ends_at > starts_at),
  CONSTRAINT subscription_campaigns_discount CHECK (
    discount_percent IS NOT NULL OR discount_usd IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_subscription_campaigns_active_window
  ON public.subscription_campaigns (is_active, starts_at, ends_at);

COMMENT ON TABLE public.subscription_campaigns IS
  'Campañas de descuento temporal aplicadas automáticamente al checkout.';

-- Ofertas enviadas a usuarios segmentados (in-app)
CREATE TABLE IF NOT EXISTS public.user_promo_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  coupon_id UUID NULL REFERENCES public.subscription_coupons (id) ON DELETE SET NULL,
  campaign_id UUID NULL REFERENCES public.subscription_campaigns (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_promo_offers_user_active
  ON public.user_promo_offers (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

-- Auditoría de otorgamientos manuales
CREATE TABLE IF NOT EXISTS public.admin_plan_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'PRO' CHECK (plan IN ('PRO', 'BUSINESS')),
  days INTEGER NOT NULL CHECK (days > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_plan_grants_user
  ON public.admin_plan_grants (user_id, created_at DESC);

-- Campos de descuento en pagos manuales
ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id UUID NULL
    REFERENCES public.subscription_campaigns (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_usd NUMERIC(10, 2);

ALTER TABLE public.subscription_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promo_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_plan_grants ENABLE ROW LEVEL SECURITY;

-- Lectura pública de cupones/campañas activos (validación en servidor sigue siendo fuente de verdad)
DROP POLICY IF EXISTS subscription_coupons_authenticated_read ON public.subscription_coupons;
CREATE POLICY subscription_coupons_authenticated_read
  ON public.subscription_coupons FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS subscription_campaigns_authenticated_read ON public.subscription_campaigns;
CREATE POLICY subscription_campaigns_authenticated_read
  ON public.subscription_campaigns FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS user_promo_offers_own_read ON public.user_promo_offers;
CREATE POLICY user_promo_offers_own_read
  ON public.user_promo_offers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_promo_offers_own_update ON public.user_promo_offers;
CREATE POLICY user_promo_offers_own_update
  ON public.user_promo_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Escrituras privilegiadas vía service role (sin policies de insert para roles normales).
