-- Sugerencias de marketing/promociones generadas por IA (aprobación manual del dueño).

CREATE TABLE IF NOT EXISTS public.marketing_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  suggestion_type TEXT NOT NULL
    CHECK (
      suggestion_type IN (
        'create_percent_coupon',
        'create_fixed_coupon',
        'create_customer_promo',
        'combo_bundle'
      )
    ),
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.marketing_ai_suggestions IS
  'Sugerencias de IA para cupones/promociones; requieren aprobación manual del dueño.';

CREATE INDEX IF NOT EXISTS marketing_ai_suggestions_store_status_idx
  ON public.marketing_ai_suggestions (store_id, status, created_at DESC);

-- Evita duplicar el mismo tipo de sugerencia pendiente por tienda.
CREATE UNIQUE INDEX IF NOT EXISTS marketing_ai_suggestions_pending_type_uidx
  ON public.marketing_ai_suggestions (store_id, suggestion_type)
  WHERE status = 'pending';

ALTER TABLE public.marketing_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketing_ai_suggestions_member_select
  ON public.marketing_ai_suggestions
  FOR SELECT
  USING (public.is_member_of_store(store_id));

CREATE POLICY marketing_ai_suggestions_member_insert
  ON public.marketing_ai_suggestions
  FOR INSERT
  WITH CHECK (public.is_member_of_store(store_id));

CREATE POLICY marketing_ai_suggestions_member_update
  ON public.marketing_ai_suggestions
  FOR UPDATE
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));
