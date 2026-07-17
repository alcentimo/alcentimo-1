-- ============================================================
-- alcentimo-1 — Perfiles de clientes finales (por tienda)
-- Ejecutar DESPUÉS de 035_support_messages.sql
--
-- Separa comerciantes (stores / store_members) de clientes finales
-- vinculados a un store_id concreto vía customer_profiles.
-- ============================================================

-- ── 1. Tabla customer_profiles ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  display_name TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT customer_profiles_user_store_unique
    UNIQUE (user_id, store_id),
  CONSTRAINT customer_profiles_display_name_length
    CHECK (display_name IS NULL OR char_length(trim(display_name)) <= 120),
  CONSTRAINT customer_profiles_phone_length
    CHECK (phone IS NULL OR char_length(trim(phone)) <= 40)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id
  ON public.customer_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_store_id
  ON public.customer_profiles (store_id);

COMMENT ON TABLE public.customer_profiles IS
  'Clientes finales registrados en la plataforma, vinculados a una tienda específica.';

COMMENT ON COLUMN public.customer_profiles.display_name IS
  'Nombre visible del cliente en pedidos y cuenta.';

COMMENT ON COLUMN public.customer_profiles.phone IS
  'Teléfono de contacto del cliente (WhatsApp, etc.).';

-- ── 2. updated_at ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_customer_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_profiles_set_updated_at ON public.customer_profiles;
CREATE TRIGGER customer_profiles_set_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_profiles_updated_at();

-- ── 3. Helpers RLS (independientes de is_member_of_store) ───

CREATE OR REPLACE FUNCTION public.is_customer_of_store(target_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customer_profiles cp
    INNER JOIN public.stores s ON s.id = cp.store_id
    WHERE cp.user_id = auth.uid()
      AND cp.store_id = target_store_id
      AND s.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_customer_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.store_id
  FROM public.customer_profiles cp
  INNER JOIN public.stores s ON s.id = cp.store_id
  WHERE cp.user_id = auth.uid()
    AND s.is_active = true;
$$;

COMMENT ON FUNCTION public.is_customer_of_store(UUID) IS
  'True si auth.uid() tiene customer_profiles activo para la tienda.';

-- ── 4. RLS customer_profiles ─────────────────────────────────

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_profiles_select_own ON public.customer_profiles;
CREATE POLICY customer_profiles_select_own
  ON public.customer_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_insert_own ON public.customer_profiles;
CREATE POLICY customer_profiles_insert_own
  ON public.customer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = store_id
        AND s.is_active = true
    )
  );

DROP POLICY IF EXISTS customer_profiles_update_own ON public.customer_profiles;
CREATE POLICY customer_profiles_update_own
  ON public.customer_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_select_store_member ON public.customer_profiles;
CREATE POLICY customer_profiles_select_store_member
  ON public.customer_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_store(store_id));

-- ── 5. orders.customer_user_id ───────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_user_created
  ON public.orders (customer_user_id, created_at DESC)
  WHERE customer_user_id IS NOT NULL;

COMMENT ON COLUMN public.orders.customer_user_id IS
  'Usuario autenticado (cliente final) que realizó el pedido; NULL en checkout anónimo legacy.';

DROP POLICY IF EXISTS orders_customer_select ON public.orders;
CREATE POLICY orders_customer_select
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    customer_user_id = auth.uid()
    AND public.is_customer_of_store(store_id)
  );
