-- Dropshipping B2B: datos de pago del proveedor + registro de pago en pedidos.
-- Alcéntimo no procesa ni retiene estos fondos; solo guarda metadatos / referencias.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supplier_order_payment_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.supplier_order_payment_status AS ENUM (
      'pendiente',
      'reportado',
      'confirmado'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.supplier_payment_profiles (
  supplier_user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  -- JSON: { methods: { pagoMovil|transferencia|zelle: { enabled, fields } }, instructions, whatsappPhone }
  payment_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.supplier_payment_profiles IS
  'Datos de pago directo del mayorista (Pago Móvil, transferencia, Zelle). Pago peer-to-peer; Alcéntimo no intermedia fondos.';

ALTER TABLE public.supplier_payment_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS source_catalog_order_id UUID
    REFERENCES public.orders (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status public.supplier_order_payment_status
    NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS supplier_orders_source_catalog_order_uidx
  ON public.supplier_orders (source_catalog_order_id)
  WHERE source_catalog_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_orders_merchant_store_created_idx
  ON public.supplier_orders (merchant_store_id, created_at DESC)
  WHERE merchant_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_orders_payment_status_idx
  ON public.supplier_orders (supplier_user_id, payment_status, created_at DESC);

COMMENT ON COLUMN public.supplier_orders.source_catalog_order_id IS
  'Pedido del catálogo (cliente final) que originó este cargo B2B al proveedor.';
COMMENT ON COLUMN public.supplier_orders.payment_reference IS
  'Referencia del pago directo emprendedor → proveedor. Alcéntimo no verifica ni mueve fondos.';
