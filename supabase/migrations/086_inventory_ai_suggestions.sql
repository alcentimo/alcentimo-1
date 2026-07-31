-- Sugerencias del Asistente Proactivo de Inventario (productos estancados).
-- El cron analiza ventas/pedidos; la IA propone acciones; el dueño aprueba con un clic.

CREATE TABLE IF NOT EXISTS public.inventory_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  days_without_sale INTEGER NOT NULL CHECK (days_without_sale >= 0),
  available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
  current_price_usd NUMERIC(12, 2),
  suggestion_type TEXT NOT NULL
    CHECK (suggestion_type IN ('discount_offer', 'feature', 'review_price')),
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.inventory_ai_suggestions IS
  'Sugerencias de IA para productos sin movimiento; requieren aprobación manual del dueño.';

CREATE INDEX IF NOT EXISTS inventory_ai_suggestions_store_status_idx
  ON public.inventory_ai_suggestions (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_ai_suggestions_product_idx
  ON public.inventory_ai_suggestions (product_id);

-- Una sola sugerencia pendiente por producto.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_ai_suggestions_pending_product_uidx
  ON public.inventory_ai_suggestions (store_id, product_id)
  WHERE status = 'pending';

ALTER TABLE public.inventory_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_ai_suggestions_member_select
  ON public.inventory_ai_suggestions
  FOR SELECT
  USING (public.is_member_of_store(store_id));

CREATE POLICY inventory_ai_suggestions_member_insert
  ON public.inventory_ai_suggestions
  FOR INSERT
  WITH CHECK (public.is_member_of_store(store_id));

CREATE POLICY inventory_ai_suggestions_member_update
  ON public.inventory_ai_suggestions
  FOR UPDATE
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

-- El cron usa service role (bypass RLS).
