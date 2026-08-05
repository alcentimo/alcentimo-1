-- ============================================================
-- alcentimo-1 — Visitas diarias (landing + catálogos)
-- Ejecutar DESPUÉS de 100_pro_trial_grace_and_manual_close.sql
-- ============================================================

-- Agregado diario: target_key = 'landing_page' | UUID de tienda
CREATE TABLE IF NOT EXISTS public.page_visit_daily (
  target_key       TEXT NOT NULL,
  store_id         UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  visit_date       DATE NOT NULL,
  unique_visitors  INTEGER NOT NULL DEFAULT 0 CHECK (unique_visitors >= 0),
  page_views       INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT page_visit_daily_pkey PRIMARY KEY (target_key, visit_date),
  CONSTRAINT page_visit_daily_target_key_check CHECK (
    target_key = 'landing_page'
    OR target_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  CONSTRAINT page_visit_daily_landing_store_null CHECK (
    (target_key = 'landing_page' AND store_id IS NULL)
    OR (target_key <> 'landing_page' AND store_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_page_visit_daily_store_date
  ON public.page_visit_daily (store_id, visit_date DESC)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_page_visit_daily_landing_date
  ON public.page_visit_daily (visit_date DESC)
  WHERE target_key = 'landing_page';

COMMENT ON TABLE public.page_visit_daily IS
  'Conteo diario de visitas únicas por sesión: landing_page o catálogo (store_id).';

-- Sesiones únicas del día (base para unique_visitors)
CREATE TABLE IF NOT EXISTS public.page_visit_sessions (
  target_key    TEXT NOT NULL,
  store_id      UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  visitor_key   TEXT NOT NULL,
  visit_date    DATE NOT NULL,
  hit_count     INTEGER NOT NULL DEFAULT 1 CHECK (hit_count >= 1),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT page_visit_sessions_pkey
    PRIMARY KEY (target_key, visitor_key, visit_date),
  CONSTRAINT page_visit_sessions_visitor_key_length
    CHECK (char_length(trim(visitor_key)) BETWEEN 8 AND 128)
);

CREATE INDEX IF NOT EXISTS idx_page_visit_sessions_store_date
  ON public.page_visit_sessions (store_id, visit_date DESC)
  WHERE store_id IS NOT NULL;

COMMENT ON TABLE public.page_visit_sessions IS
  'Visitantes únicos por día y destino (cookie de sesión).';

-- Vistas de producto (para “más visto”)
CREATE TABLE IF NOT EXISTS public.catalog_product_view_daily (
  store_id       UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  visit_date     DATE NOT NULL,
  unique_viewers INTEGER NOT NULL DEFAULT 0 CHECK (unique_viewers >= 0),
  views          INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT catalog_product_view_daily_pkey
    PRIMARY KEY (store_id, product_id, visit_date)
);

CREATE TABLE IF NOT EXISTS public.catalog_product_view_sessions (
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  visitor_key   TEXT NOT NULL,
  visit_date    DATE NOT NULL,
  view_count    INTEGER NOT NULL DEFAULT 1 CHECK (view_count >= 1),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT catalog_product_view_sessions_pkey
    PRIMARY KEY (store_id, product_id, visitor_key, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_catalog_product_view_daily_store_date
  ON public.catalog_product_view_daily (store_id, visit_date DESC);

-- Fecha local Venezuela
CREATE OR REPLACE FUNCTION public.alcentimo_local_date()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT (timezone('America/Caracas', now()))::date;
$$;

CREATE OR REPLACE FUNCTION public.record_page_visit(
  p_target_key TEXT,
  p_store_id UUID,
  p_visitor_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := public.alcentimo_local_date();
  v_key TEXT := trim(p_target_key);
  v_visitor TEXT := trim(p_visitor_key);
  v_rows INTEGER := 0;
  v_is_new BOOLEAN := false;
BEGIN
  IF v_key IS NULL OR v_key = '' OR v_visitor IS NULL OR char_length(v_visitor) < 8 THEN
    RETURN;
  END IF;

  IF v_key = 'landing_page' THEN
    p_store_id := NULL;
  ELSIF p_store_id IS NULL OR v_key <> p_store_id::text THEN
    IF p_store_id IS NULL THEN
      RETURN;
    END IF;
    v_key := p_store_id::text;
  END IF;

  INSERT INTO public.page_visit_sessions (
    target_key, store_id, visitor_key, visit_date
  )
  VALUES (v_key, p_store_id, v_visitor, v_date)
  ON CONFLICT (target_key, visitor_key, visit_date) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_is_new := v_rows > 0;

  IF NOT v_is_new THEN
    UPDATE public.page_visit_sessions
    SET
      hit_count = hit_count + 1,
      last_seen_at = now()
    WHERE target_key = v_key
      AND visitor_key = v_visitor
      AND visit_date = v_date;
  END IF;

  INSERT INTO public.page_visit_daily (
    target_key, store_id, visit_date, unique_visitors, page_views
  )
  VALUES (
    v_key,
    p_store_id,
    v_date,
    CASE WHEN v_is_new THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (target_key, visit_date) DO UPDATE
  SET
    unique_visitors = public.page_visit_daily.unique_visitors
      + CASE WHEN v_is_new THEN 1 ELSE 0 END,
    page_views = public.page_visit_daily.page_views + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.record_catalog_product_view(
  p_store_id UUID,
  p_product_id UUID,
  p_visitor_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := public.alcentimo_local_date();
  v_visitor TEXT := trim(p_visitor_key);
  v_rows INTEGER := 0;
  v_is_new BOOLEAN := false;
BEGIN
  IF p_store_id IS NULL OR p_product_id IS NULL OR v_visitor IS NULL OR char_length(v_visitor) < 8 THEN
    RETURN;
  END IF;

  INSERT INTO public.catalog_product_view_sessions (
    store_id, product_id, visitor_key, visit_date
  )
  VALUES (p_store_id, p_product_id, v_visitor, v_date)
  ON CONFLICT (store_id, product_id, visitor_key, visit_date) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_is_new := v_rows > 0;

  IF NOT v_is_new THEN
    UPDATE public.catalog_product_view_sessions
    SET
      view_count = view_count + 1,
      last_seen_at = now()
    WHERE store_id = p_store_id
      AND product_id = p_product_id
      AND visitor_key = v_visitor
      AND visit_date = v_date;
  END IF;

  INSERT INTO public.catalog_product_view_daily (
    store_id, product_id, visit_date, unique_viewers, views
  )
  VALUES (
    p_store_id,
    p_product_id,
    v_date,
    CASE WHEN v_is_new THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (store_id, product_id, visit_date) DO UPDATE
  SET
    unique_viewers = public.catalog_product_view_daily.unique_viewers
      + CASE WHEN v_is_new THEN 1 ELSE 0 END,
    views = public.catalog_product_view_daily.views + 1,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_page_visit(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_catalog_product_view(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_page_visit(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_catalog_product_view(UUID, UUID, TEXT) TO service_role;

ALTER TABLE public.page_visit_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_product_view_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_product_view_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS page_visit_daily_select_store_member ON public.page_visit_daily;
CREATE POLICY page_visit_daily_select_store_member
  ON public.page_visit_daily
  FOR SELECT
  TO authenticated
  USING (
    store_id IS NOT NULL
    AND public.is_member_of_store(store_id)
  );

DROP POLICY IF EXISTS catalog_product_view_daily_select_member ON public.catalog_product_view_daily;
CREATE POLICY catalog_product_view_daily_select_member
  ON public.catalog_product_view_daily
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_store(store_id));

-- Escritura solo vía service role (RPC SECURITY DEFINER).
