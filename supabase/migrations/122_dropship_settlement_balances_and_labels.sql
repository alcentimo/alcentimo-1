-- Al aprobar el pago único del dropshipper: saldos (proveedor vs comisión Alcéntimo)
-- y etiquetado de despacho con el nombre de la tienda (sin datos del mayorista).

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS sender_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dispatch_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.supplier_orders.sender_name IS
  'Remitente visible en la etiqueta de despacho: nombre de la tienda del dropshipper. Nunca el mayorista.';
COMMENT ON COLUMN public.supplier_orders.dispatch_notified_at IS
  'Momento en que se notificó al mayorista la orden detallada para despacho D+1.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'settlement_ledger_party_kind'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.settlement_ledger_party_kind AS ENUM (
      'platform',
      'supplier'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.settlement_balance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.dropship_daily_settlements (id) ON DELETE CASCADE,
  account_key TEXT NOT NULL,
  party_kind public.settlement_ledger_party_kind NOT NULL,
  party_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  amount_usd NUMERIC(12, 2) NOT NULL CHECK (amount_usd >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settlement_balance_entries_settlement_account_unique
    UNIQUE (settlement_id, account_key)
);

CREATE INDEX IF NOT EXISTS settlement_balance_entries_party_idx
  ON public.settlement_balance_entries (party_kind, party_user_id);

CREATE INDEX IF NOT EXISTS settlement_balance_entries_settlement_idx
  ON public.settlement_balance_entries (settlement_id);

COMMENT ON TABLE public.settlement_balance_entries IS
  'División del pago único aprobado: crédito al saldo de cada mayorista (costo de producto) y a Alcéntimo (comisión).';

ALTER TABLE public.settlement_balance_entries ENABLE ROW LEVEL SECURITY;
