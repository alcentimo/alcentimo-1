-- Estados de corrección / rechazo permanente en pagos manuales.

ALTER TABLE public.manual_payments
  DROP CONSTRAINT IF EXISTS manual_payments_status_check;

ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS permanently_rejected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS correction_requested_at TIMESTAMPTZ;

ALTER TABLE public.manual_payments
  ADD CONSTRAINT manual_payments_status_check
  CHECK (status IN ('pending', 'verified', 'needs_correction', 'rejected'));

COMMENT ON COLUMN public.manual_payments.admin_note IS
  'Motivo visible al usuario (corrección solicitada o rechazo permanente).';
COMMENT ON COLUMN public.manual_payments.permanently_rejected IS
  'true = rechazo definitivo; bloquea reenviar la misma referencia.';
COMMENT ON COLUMN public.manual_payments.correction_requested_at IS
  'Cuándo el admin pidió corregir el comprobante.';

CREATE INDEX IF NOT EXISTS idx_manual_payments_user_status
  ON public.manual_payments (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_payments_user_reference
  ON public.manual_payments (user_id, reference_number);
