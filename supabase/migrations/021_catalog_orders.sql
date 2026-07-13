-- ============================================================
-- alcentimo-1 — Pedidos del catálogo transaccional público
-- Ejecutar DESPUÉS de 015_ventas.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name     TEXT NOT NULL,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_usd         NUMERIC(12, 2) NOT NULL,
  payment_proof_url TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_orders_store_created
  ON public.orders (store_id, created_at DESC);

COMMENT ON TABLE public.orders IS
  'Pedidos del catálogo público /c/[slug]: resumen, comprobante y estado.';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_member_select ON public.orders;
CREATE POLICY orders_member_select
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS orders_member_update ON public.orders;
CREATE POLICY orders_member_update
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

-- Bucket para comprobantes de pago (lectura pública; escritura vía service role en servidor)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-payment-proofs',
  'order-payment-proofs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_order_payment_proofs" ON storage.objects;
CREATE POLICY "public_read_order_payment_proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'order-payment-proofs');
