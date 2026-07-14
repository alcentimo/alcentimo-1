-- ============================================================
-- alcentimo-1 — Reportes de pago de suscripción (Pago Móvil)
-- Ejecutar DESPUÉS de 023_store_logos_storage.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id          TEXT NOT NULL,
  billing_period   TEXT NOT NULL,
  amount_usd       NUMERIC(10, 2) NOT NULL,
  reference_number TEXT NOT NULL,
  origin_bank      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payment_reports_plan_check
    CHECK (plan_id IN ('starter', 'premium')),
  CONSTRAINT payment_reports_billing_check
    CHECK (billing_period IN ('monthly', 'annual')),
  CONSTRAINT payment_reports_status_check
    CHECK (status IN ('pending', 'verified', 'rejected')),
  CONSTRAINT payment_reports_reference_nonempty
    CHECK (char_length(trim(reference_number)) >= 4),
  CONSTRAINT payment_reports_origin_bank_nonempty
    CHECK (char_length(trim(origin_bank)) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_payment_reports_user_created
  ON public.payment_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_reports_status_created
  ON public.payment_reports (status, created_at DESC);

COMMENT ON TABLE public.payment_reports IS
  'Reportes de Pago Móvil enviados por comercios al contratar un plan.';

ALTER TABLE public.payment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_reports_select_own ON public.payment_reports;
CREATE POLICY payment_reports_select_own
  ON public.payment_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS payment_reports_insert_own ON public.payment_reports;
CREATE POLICY payment_reports_insert_own
  ON public.payment_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
