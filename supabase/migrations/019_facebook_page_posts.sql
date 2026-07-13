-- Publicaciones de productos en Facebook Page vía Graph API.

CREATE TABLE IF NOT EXISTS public.facebook_page_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  integration_id  UUID REFERENCES public.channel_integrations(id) ON DELETE SET NULL,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  page_id         TEXT NOT NULL,
  graph_post_id   TEXT NOT NULL,
  message         TEXT,
  media_url       TEXT,
  permalink_url   TEXT,
  status          TEXT NOT NULL DEFAULT 'published'
                    CHECK (status IN ('pending', 'published', 'failed')),
  published_at    TIMESTAMPTZ,
  raw_response    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT facebook_page_posts_graph_unique
    UNIQUE (store_id, graph_post_id)
);

CREATE INDEX IF NOT EXISTS idx_facebook_page_posts_store_product
  ON public.facebook_page_posts (store_id, product_id, published_at DESC);

ALTER TABLE public.facebook_page_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS facebook_page_posts_member ON public.facebook_page_posts;
CREATE POLICY facebook_page_posts_member
  ON public.facebook_page_posts FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

DROP TRIGGER IF EXISTS trg_facebook_page_posts_updated_at ON public.facebook_page_posts;
CREATE TRIGGER trg_facebook_page_posts_updated_at
BEFORE UPDATE ON public.facebook_page_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
