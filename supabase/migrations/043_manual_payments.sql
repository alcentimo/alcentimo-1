-- ============================================================
-- alcentimo-1 — Pagos manuales con Acceso de Confianza
-- Ejecutar DESPUÉS de 042_profiles_pro_trial.sql
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('none', 'provisional', 'active'));

COMMENT ON COLUMN public.profiles.subscription_status IS
  'none = sin suscripción de pago; provisional = acceso Pro otorgado al reportar pago; active = verificado por admin.';

CREATE TABLE IF NOT EXISTS public.manual_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id          TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  image_url        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,

  CONSTRAINT manual_payments_plan_check
    CHECK (plan_id IN ('starter', 'premium')),
  CONSTRAINT manual_payments_status_check
    CHECK (status IN ('pending', 'verified', 'rejected')),
  CONSTRAINT manual_payments_reference_nonempty
    CHECK (char_length(trim(reference_number)) >= 4),
  CONSTRAINT manual_payments_image_url_nonempty
    CHECK (char_length(trim(image_url)) >= 8)
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_user_created
  ON public.manual_payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_payments_status_created
  ON public.manual_payments (status, created_at DESC);

COMMENT ON TABLE public.manual_payments IS
  'Pagos manuales (Pago Móvil) con comprobante. Acceso provisional al reportar; verificación admin.';

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manual_payments_select_own ON public.manual_payments;
CREATE POLICY manual_payments_select_own
  ON public.manual_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS manual_payments_insert_own ON public.manual_payments;
CREATE POLICY manual_payments_insert_own
  ON public.manual_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Comprobantes de suscripción (captura del pago)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subscription-payment-proofs',
  'subscription-payment-proofs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_subscription_payment_proofs" ON storage.objects;
CREATE POLICY "public_read_subscription_payment_proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'subscription-payment-proofs');

DROP POLICY IF EXISTS "users_upload_own_subscription_payment_proofs" ON storage.objects;
CREATE POLICY "users_upload_own_subscription_payment_proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'subscription-payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
