-- Saldo a favor de clientes (estilo Amazon) solo en la vitrina del administrador.
-- El cliente carga tarjetas a su cuenta; el checkout descuenta el saldo del perfil.

CREATE TABLE IF NOT EXISTS public.customer_store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (balance_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_store_credits_store_user_unique UNIQUE (store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_store_credits_user
  ON public.customer_store_credits (user_id);

COMMENT ON TABLE public.customer_store_credits IS
  'Saldo a favor del cliente en una tienda. Solo se usa en la vitrina del administrador.';

DROP TRIGGER IF EXISTS trg_customer_store_credits_updated_at
  ON public.customer_store_credits;
CREATE TRIGGER trg_customer_store_credits_updated_at
BEFORE UPDATE ON public.customer_store_credits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.customer_store_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_store_credits_select_own
  ON public.customer_store_credits;
CREATE POLICY customer_store_credits_select_own
  ON public.customer_store_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.gift_card_redemptions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.gift_card_redemptions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'order';

ALTER TABLE public.gift_card_redemptions
  DROP CONSTRAINT IF EXISTS gift_card_redemptions_kind_check;
ALTER TABLE public.gift_card_redemptions
  ADD CONSTRAINT gift_card_redemptions_kind_check
  CHECK (kind IN ('order', 'wallet'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS store_credit_usd NUMERIC(12, 2);

-- Carga el saldo restante de una tarjeta al perfil del cliente (misma tienda).
CREATE OR REPLACE FUNCTION public.apply_gift_card_to_wallet(
  p_code TEXT,
  p_store_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card public.gift_cards%ROWTYPE;
  v_code TEXT := upper(trim(p_code));
  v_amount NUMERIC(12, 2);
  v_new_wallet NUMERIC(12, 2);
BEGIN
  IF v_code IS NULL OR v_code = '' THEN
    RETURN jsonb_build_object('error', 'Ingresa un código de tarjeta de regalo.');
  END IF;
  IF p_store_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sesión o tienda no válida.');
  END IF;

  SELECT *
    INTO v_card
    FROM public.gift_cards
   WHERE code = v_code
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Tarjeta de regalo no válida.');
  END IF;

  IF v_card.store_id IS DISTINCT FROM p_store_id THEN
    RETURN jsonb_build_object(
      'error',
      'Esta tarjeta de regalo solo puede usarse en la tienda de Alcéntimo.'
    );
  END IF;

  IF v_card.status = 'disabled' THEN
    RETURN jsonb_build_object('error', 'Esta tarjeta de regalo está desactivada.');
  END IF;

  IF v_card.status = 'depleted' OR v_card.current_balance_usd <= 0 THEN
    RETURN jsonb_build_object('error', 'Esta tarjeta de regalo no tiene saldo.');
  END IF;

  IF v_card.status <> 'active' THEN
    RETURN jsonb_build_object('error', 'Esta tarjeta de regalo no está disponible.');
  END IF;

  v_amount := round(v_card.current_balance_usd, 2);

  INSERT INTO public.customer_store_credits (store_id, user_id, balance_usd)
  VALUES (p_store_id, p_user_id, v_amount)
  ON CONFLICT (store_id, user_id)
  DO UPDATE SET
    balance_usd = round(public.customer_store_credits.balance_usd + EXCLUDED.balance_usd, 2),
    updated_at = now()
  RETURNING balance_usd INTO v_new_wallet;

  UPDATE public.gift_cards
     SET current_balance_usd = 0,
         status = 'depleted',
         updated_at = now()
   WHERE id = v_card.id;

  INSERT INTO public.gift_card_redemptions (
    gift_card_id,
    store_id,
    order_id,
    amount_usd,
    user_id,
    kind
  ) VALUES (
    v_card.id,
    p_store_id,
    NULL,
    v_amount,
    p_user_id,
    'wallet'
  );

  RETURN jsonb_build_object(
    'success', true,
    'credited_usd', v_amount,
    'wallet_usd', v_new_wallet
  );
END;
$$;

-- Descuenta saldo a favor del cliente al confirmar un pedido.
CREATE OR REPLACE FUNCTION public.apply_store_credit_for_order(
  p_store_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.customer_store_credits%ROWTYPE;
  v_amount NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
BEGIN
  IF p_store_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sesión o tienda no válida.');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Monto de saldo a favor inválido.');
  END IF;

  v_amount := round(p_amount, 2);

  SELECT *
    INTO v_row
    FROM public.customer_store_credits
   WHERE store_id = p_store_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND OR v_row.balance_usd < v_amount THEN
    RETURN jsonb_build_object('error', 'No tienes saldo a favor suficiente.');
  END IF;

  v_new_balance := round(v_row.balance_usd - v_amount, 2);

  UPDATE public.customer_store_credits
     SET balance_usd = v_new_balance,
         updated_at = now()
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'applied_usd', v_amount,
    'wallet_usd', v_new_balance,
    'order_id', p_order_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_store_credit(
  p_store_id UUID,
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC(12, 2);
  v_new_wallet NUMERIC(12, 2);
BEGIN
  IF p_store_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sesión o tienda no válida.');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  v_amount := round(p_amount, 2);

  INSERT INTO public.customer_store_credits (store_id, user_id, balance_usd)
  VALUES (p_store_id, p_user_id, v_amount)
  ON CONFLICT (store_id, user_id)
  DO UPDATE SET
    balance_usd = round(public.customer_store_credits.balance_usd + EXCLUDED.balance_usd, 2),
    updated_at = now()
  RETURNING balance_usd INTO v_new_wallet;

  RETURN jsonb_build_object(
    'success', true,
    'wallet_usd', v_new_wallet
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_gift_card_to_wallet(TEXT, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_gift_card_to_wallet(TEXT, UUID, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.apply_store_credit_for_order(UUID, UUID, UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_store_credit_for_order(UUID, UUID, UUID, NUMERIC)
  TO service_role;

REVOKE ALL ON FUNCTION public.restore_store_credit(UUID, UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_store_credit(UUID, UUID, NUMERIC)
  TO service_role;
