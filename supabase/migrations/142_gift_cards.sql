-- Tarjetas de regalo exclusivas de la tienda del administrador de Alcéntimo.
-- No hay políticas RLS para miembros de tienda: dropshippers no leen ni escriben.

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  initial_balance_usd NUMERIC(12, 2) NOT NULL
    CHECK (initial_balance_usd > 0),
  current_balance_usd NUMERIC(12, 2) NOT NULL
    CHECK (current_balance_usd >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled', 'depleted')),
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gift_cards_code_unique UNIQUE (code),
  CONSTRAINT gift_cards_code_format CHECK (code ~ '^[A-Z0-9_-]+$'),
  CONSTRAINT gift_cards_balance_not_over_initial CHECK (
    current_balance_usd <= initial_balance_usd
  )
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_store
  ON public.gift_cards (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gift_cards_store_status
  ON public.gift_cards (store_id, status)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_usd NUMERIC(12, 2) NOT NULL CHECK (amount_usd > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_card
  ON public.gift_card_redemptions (gift_card_id, created_at DESC);

COMMENT ON TABLE public.gift_cards IS
  'Tarjetas de saldo exclusivas de la tienda del administrador. No aplican a vitrinas de dropshippers.';

DROP TRIGGER IF EXISTS trg_gift_cards_updated_at ON public.gift_cards;
CREATE TRIGGER trg_gift_cards_updated_at
BEFORE UPDATE ON public.gift_cards
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon/authenticated: solo service_role (o postgres) opera.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gift_card_code TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gift_card_usd NUMERIC(12, 2);

-- Canje atómico: exige que la tarjeta pertenezca a la misma tienda del pedido.
CREATE OR REPLACE FUNCTION public.redeem_gift_card_for_order(
  p_code TEXT,
  p_store_id UUID,
  p_order_id UUID,
  p_amount NUMERIC
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
  v_new_balance NUMERIC(12, 2);
BEGIN
  IF v_code IS NULL OR v_code = '' THEN
    RETURN jsonb_build_object('error', 'Ingresa un código de tarjeta de regalo.');
  END IF;

  IF p_store_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Tienda no válida.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Monto de canje inválido.');
  END IF;

  v_amount := round(p_amount, 2);

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
      'Esta tarjeta de regalo solo puede canjearse en la tienda de Alcéntimo.'
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

  IF v_card.current_balance_usd < v_amount THEN
    RETURN jsonb_build_object(
      'error',
      'El saldo de la tarjeta es insuficiente.'
    );
  END IF;

  v_new_balance := round(v_card.current_balance_usd - v_amount, 2);

  UPDATE public.gift_cards
     SET current_balance_usd = v_new_balance,
         status = CASE WHEN v_new_balance <= 0 THEN 'depleted' ELSE status END,
         updated_at = now()
   WHERE id = v_card.id;

  INSERT INTO public.gift_card_redemptions (
    gift_card_id,
    store_id,
    order_id,
    amount_usd
  ) VALUES (
    v_card.id,
    p_store_id,
    p_order_id,
    v_amount
  );

  RETURN jsonb_build_object(
    'success', true,
    'applied_usd', v_amount,
    'remaining_usd', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_gift_card_for_order(TEXT, UUID, UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card_for_order(TEXT, UUID, UUID, NUMERIC)
  TO service_role;
