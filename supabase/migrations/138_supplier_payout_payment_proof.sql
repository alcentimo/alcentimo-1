-- Comprobante de pago Alcéntimo → proveedor (liquidación marcada como pagada).

ALTER TABLE public.supplier_payout_obligations
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.supplier_payout_obligations.payment_proof_url IS
  'Capture del pago de Alcéntimo al mayorista. Visible en el hub del proveedor.';
COMMENT ON COLUMN public.supplier_payout_obligations.paid_at IS
  'Momento en que el administrador marcó la obligación como pagada.';
