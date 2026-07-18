-- ============================================================
-- alcentimo-1 — Carrito persistente de clientes finales
-- Ejecutar DESPUÉS de 036_customer_profiles.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT customer_cart_items_quantity_positive
    CHECK (quantity > 0),
  CONSTRAINT customer_cart_items_user_store_product_variant_unique
    UNIQUE (user_id, store_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_cart_items_user_store
  ON public.customer_cart_items (user_id, store_id);

COMMENT ON TABLE public.customer_cart_items IS
  'Ítems del carrito de compras por cliente y tienda; variant_id coincide con el catálogo transaccional.';

COMMENT ON COLUMN public.customer_cart_items.variant_id IS
  'Identificador de variante del catálogo (default_variant_id o id en product_variants JSON).';

-- ── updated_at ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_customer_cart_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_cart_items_set_updated_at ON public.customer_cart_items;
CREATE TRIGGER customer_cart_items_set_updated_at
  BEFORE UPDATE ON public.customer_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_cart_items_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.customer_cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_cart_items_select_own ON public.customer_cart_items;
CREATE POLICY customer_cart_items_select_own
  ON public.customer_cart_items
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.is_customer_of_store(store_id)
  );

DROP POLICY IF EXISTS customer_cart_items_insert_own ON public.customer_cart_items;
CREATE POLICY customer_cart_items_insert_own
  ON public.customer_cart_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_customer_of_store(store_id)
    AND public.product_store_id(product_id) = store_id
  );

DROP POLICY IF EXISTS customer_cart_items_update_own ON public.customer_cart_items;
CREATE POLICY customer_cart_items_update_own
  ON public.customer_cart_items
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.is_customer_of_store(store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_customer_of_store(store_id)
    AND public.product_store_id(product_id) = store_id
  );

DROP POLICY IF EXISTS customer_cart_items_delete_own ON public.customer_cart_items;
CREATE POLICY customer_cart_items_delete_own
  ON public.customer_cart_items
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.is_customer_of_store(store_id)
  );
