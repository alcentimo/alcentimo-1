-- Liquidación diaria centralizada: dropshipper → Alcéntimo → mayoristas (D+1).

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS dropship_platform_markup_percent NUMERIC(6, 2)
    NOT NULL DEFAULT 5
    CHECK (dropship_platform_markup_percent >= 0 AND dropship_platform_markup_percent <= 100);

COMMENT ON COLUMN public.platform_settings.dropship_platform_markup_percent IS
  'Markup operativo (%) que Alcéntimo suma al costo mayorista en el cierre diario del dropshipper.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'dropship_settlement_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.dropship_settlement_status AS ENUM (
      'reported',
      'approved',
      'rejected'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supplier_payout_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.supplier_payout_status AS ENUM (
      'pending',
      'scheduled',
      'paid'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.dropship_daily_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  merchant_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  store_name TEXT NOT NULL DEFAULT '',
  merchant_email TEXT,
  order_count INTEGER NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  wholesale_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (wholesale_cost_usd >= 0),
  platform_markup_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_markup_usd >= 0),
  markup_percent NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (markup_percent >= 0),
  amount_due_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_due_usd >= 0),
  status public.dropship_settlement_status NOT NULL DEFAULT 'reported',
  payment_method TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  payment_notes TEXT NOT NULL DEFAULT '',
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  review_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dropship_daily_settlements_store_date_unique UNIQUE (store_id, business_date)
);

CREATE INDEX IF NOT EXISTS dropship_daily_settlements_status_idx
  ON public.dropship_daily_settlements (status, reported_at DESC);

CREATE INDEX IF NOT EXISTS dropship_daily_settlements_store_idx
  ON public.dropship_daily_settlements (store_id, business_date DESC);

COMMENT ON TABLE public.dropship_daily_settlements IS
  'Cierre diario: el dropshipper paga a Alcéntimo el costo mayorista + markup operativo de las ventas confirmadas.';

CREATE TABLE IF NOT EXISTS public.dropship_daily_settlement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.dropship_daily_settlements (id) ON DELETE CASCADE,
  catalog_order_id UUID REFERENCES public.orders (id) ON DELETE SET NULL,
  supplier_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  supplier_product_id UUID REFERENCES public.supplier_products (id) ON DELETE SET NULL,
  product_title TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_usd NUMERIC(12, 2) NOT NULL CHECK (unit_cost_usd >= 0),
  platform_markup_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_markup_usd >= 0),
  line_due_usd NUMERIC(12, 2) NOT NULL CHECK (line_due_usd >= 0),
  supplier_payout_usd NUMERIC(12, 2) NOT NULL CHECK (supplier_payout_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dropship_daily_settlement_lines_settlement_idx
  ON public.dropship_daily_settlement_lines (settlement_id);

CREATE INDEX IF NOT EXISTS dropship_daily_settlement_lines_order_idx
  ON public.dropship_daily_settlement_lines (catalog_order_id)
  WHERE catalog_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS dropship_daily_settlement_lines_supplier_idx
  ON public.dropship_daily_settlement_lines (supplier_user_id);

COMMENT ON TABLE public.dropship_daily_settlement_lines IS
  'Líneas del cierre diario (snapshot de costo mayorista y markup de plataforma).';

CREATE TABLE IF NOT EXISTS public.supplier_payout_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.dropship_daily_settlements (id) ON DELETE CASCADE,
  supplier_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  ship_on DATE NOT NULL,
  amount_usd NUMERIC(12, 2) NOT NULL CHECK (amount_usd >= 0),
  order_count INTEGER NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  line_count INTEGER NOT NULL DEFAULT 0 CHECK (line_count >= 0),
  status public.supplier_payout_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT supplier_payout_obligations_settlement_supplier_unique
    UNIQUE (settlement_id, supplier_user_id)
);

CREATE INDEX IF NOT EXISTS supplier_payout_obligations_supplier_idx
  ON public.supplier_payout_obligations (supplier_user_id, ship_on DESC);

COMMENT ON TABLE public.supplier_payout_obligations IS
  'Obligación de Alcéntimo hacia cada mayorista tras aprobar el cierre diario del dropshipper. Despacho D+1.';

ALTER TABLE public.dropship_daily_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_daily_settlement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payout_obligations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS settlement_id UUID
    REFERENCES public.dropship_daily_settlements (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ship_on DATE;

DROP INDEX IF EXISTS public.supplier_orders_source_catalog_order_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS supplier_orders_source_catalog_supplier_uidx
  ON public.supplier_orders (source_catalog_order_id, supplier_user_id)
  WHERE source_catalog_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_orders_settlement_idx
  ON public.supplier_orders (settlement_id)
  WHERE settlement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_orders_ship_on_idx
  ON public.supplier_orders (supplier_user_id, ship_on)
  WHERE ship_on IS NOT NULL;

COMMENT ON COLUMN public.supplier_orders.settlement_id IS
  'Cierre diario que habilitó este pedido para despacho D+1.';
COMMENT ON COLUMN public.supplier_orders.ship_on IS
  'Fecha (America/Caracas) a partir de la cual el mayorista debe despachar (D+1 del cierre).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dropship-settlement-proofs',
  'dropship-settlement-proofs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_dropship_settlement_proofs" ON storage.objects;
CREATE POLICY "public_read_dropship_settlement_proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'dropship-settlement-proofs');

DROP POLICY IF EXISTS "users_upload_own_dropship_settlement_proofs" ON storage.objects;
CREATE POLICY "users_upload_own_dropship_settlement_proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dropship-settlement-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
