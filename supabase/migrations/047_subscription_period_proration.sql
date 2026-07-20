-- Período de suscripción + prorrateo en pagos manuales (upgrade PRO → Business).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_period_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_period TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_billing_period_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_billing_period_check
  CHECK (
    billing_period IS NULL
    OR billing_period IN ('monthly', 'annual')
  );

COMMENT ON COLUMN public.profiles.subscription_period_started_at IS
  'Inicio del ciclo de facturación del plan de pago actual.';
COMMENT ON COLUMN public.profiles.subscription_period_ends_at IS
  'Fin del ciclo; se usa para calcular días restantes y saldo a favor en upgrades.';
COMMENT ON COLUMN public.profiles.billing_period IS
  'monthly | annual del ciclo activo.';

ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS from_plan TEXT,
  ADD COLUMN IF NOT EXISTS from_billing_period TEXT,
  ADD COLUMN IF NOT EXISTS list_price_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS credit_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS days_remaining INTEGER,
  ADD COLUMN IF NOT EXISTS credited_period_ends_at TIMESTAMPTZ;

ALTER TABLE public.manual_payments
  DROP CONSTRAINT IF EXISTS manual_payments_billing_period_check;

ALTER TABLE public.manual_payments
  ADD CONSTRAINT manual_payments_billing_period_check
  CHECK (billing_period IN ('monthly', 'annual'));

COMMENT ON COLUMN public.manual_payments.credit_usd IS
  'Saldo a favor por días no consumidos del plan anterior (p. ej. PRO).';
COMMENT ON COLUMN public.manual_payments.amount_due_usd IS
  'Monto esperado tras restar el saldo a favor del precio del plan nuevo.';
COMMENT ON COLUMN public.manual_payments.days_remaining IS
  'Días restantes del plan anterior al reportar/confirmar el upgrade.';
