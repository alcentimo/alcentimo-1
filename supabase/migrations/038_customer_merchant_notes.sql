-- ============================================================
-- alcentimo-1 — Notas internas del comerciante por cliente
-- Ejecutar DESPUÉS de 037_customer_cart_items.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_merchant_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT customer_merchant_notes_store_user_unique
    UNIQUE (store_id, customer_user_id),
  CONSTRAINT customer_merchant_notes_body_length
    CHECK (char_length(body) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_customer_merchant_notes_store
  ON public.customer_merchant_notes (store_id);

COMMENT ON TABLE public.customer_merchant_notes IS
  'Notas privadas del dueño de la tienda sobre un cliente registrado.';

CREATE OR REPLACE FUNCTION public.set_customer_merchant_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_merchant_notes_set_updated_at ON public.customer_merchant_notes;
CREATE TRIGGER customer_merchant_notes_set_updated_at
  BEFORE UPDATE ON public.customer_merchant_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_merchant_notes_updated_at();

ALTER TABLE public.customer_merchant_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_merchant_notes_owner_select ON public.customer_merchant_notes;
CREATE POLICY customer_merchant_notes_owner_select
  ON public.customer_merchant_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS customer_merchant_notes_owner_insert ON public.customer_merchant_notes;
CREATE POLICY customer_merchant_notes_owner_insert
  ON public.customer_merchant_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS customer_merchant_notes_owner_update ON public.customer_merchant_notes;
CREATE POLICY customer_merchant_notes_owner_update
  ON public.customer_merchant_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS customer_merchant_notes_owner_delete ON public.customer_merchant_notes;
CREATE POLICY customer_merchant_notes_owner_delete
  ON public.customer_merchant_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
    )
  );
