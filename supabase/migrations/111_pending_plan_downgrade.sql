-- Downgrades diferidos: el plan inferior se programa para el fin del ciclo actual.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_plan TEXT,
  ADD COLUMN IF NOT EXISTS pending_billing_period TEXT,
  ADD COLUMN IF NOT EXISTS pending_plan_effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_plan_requested_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_pending_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pending_plan_check
  CHECK (
    pending_plan IS NULL
    OR pending_plan IN ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE')
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_pending_billing_period_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pending_billing_period_check
  CHECK (
    pending_billing_period IS NULL
    OR pending_billing_period IN ('monthly', 'annual')
  );

COMMENT ON COLUMN public.profiles.pending_plan IS
  'Plan programado (downgrade). Se aplica en pending_plan_effective_at sin reducir beneficios antes.';
COMMENT ON COLUMN public.profiles.pending_billing_period IS
  'Ciclo del plan programado (null si pending_plan = FREE).';
COMMENT ON COLUMN public.profiles.pending_plan_effective_at IS
  'Fecha/hora en que el plan programado sustituye al actual (normalmente el corte vigente).';
COMMENT ON COLUMN public.profiles.pending_plan_requested_at IS
  'Cuándo el usuario solicitó el cambio de plan diferido.';

CREATE INDEX IF NOT EXISTS profiles_pending_plan_due_idx
  ON public.profiles (pending_plan_effective_at)
  WHERE pending_plan IS NOT NULL;
