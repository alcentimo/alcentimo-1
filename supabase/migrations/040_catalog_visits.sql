-- ============================================================
-- alcentimo-1 — Visitas al catálogo (métricas de conversión)
-- Ejecutar DESPUÉS de 039_promotions_customer_exclusive.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.catalog_visits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  visitor_key    TEXT NOT NULL,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  registered_at  TIMESTAMPTZ,
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT catalog_visits_store_visitor_unique
    UNIQUE (store_id, visitor_key),
  CONSTRAINT catalog_visits_visitor_key_length
    CHECK (char_length(trim(visitor_key)) BETWEEN 8 AND 128)
);

CREATE INDEX IF NOT EXISTS idx_catalog_visits_store_last_seen
  ON public.catalog_visits (store_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_visits_store_registered
  ON public.catalog_visits (store_id, registered_at DESC)
  WHERE registered_at IS NOT NULL;

COMMENT ON TABLE public.catalog_visits IS
  'Visitantes únicos del catálogo /c/{slug} por cookie anónima; usado para tasa de registro.';

ALTER TABLE public.catalog_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_visits_select_store_member ON public.catalog_visits;
CREATE POLICY catalog_visits_select_store_member
  ON public.catalog_visits
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_store(store_id));

-- Escritura solo vía service role (server actions).
