-- Rate limit de canje/validación de gift cards (anti fuerza bruta).
-- Solo service_role escribe; el cliente nunca lee esta tabla.

CREATE TABLE IF NOT EXISTS public.gift_card_attempt_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gift_card_attempt_limits_store_subject UNIQUE (store_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_gift_card_attempt_limits_blocked
  ON public.gift_card_attempt_limits (blocked_until)
  WHERE blocked_until IS NOT NULL;

COMMENT ON TABLE public.gift_card_attempt_limits IS
  'Contadores de intentos de canje de gift cards por tienda + sujeto (IP o usuario).';

ALTER TABLE public.gift_card_attempt_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gift_card_attempt_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.gift_card_attempt_limits TO service_role;

-- Reserva un intento. Si el sujeto está bloqueado o superó el tope, no consulta la tarjeta.
CREATE OR REPLACE FUNCTION public.consume_gift_card_rate_limit(
  p_store_id UUID,
  p_subject TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_card_attempt_limits%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_window INTERVAL := INTERVAL '15 minutes';
  v_block INTERVAL := INTERVAL '30 minutes';
  v_min_gap INTERVAL := INTERVAL '2 seconds';
  v_max_attempts INTEGER := 8;
  v_max_failed INTEGER := 5;
  v_retry INTEGER;
BEGIN
  IF p_store_id IS NULL OR p_subject IS NULL OR length(trim(p_subject)) < 3 THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after_seconds', 30);
  END IF;

  INSERT INTO public.gift_card_attempt_limits (store_id, subject)
  VALUES (p_store_id, trim(p_subject))
  ON CONFLICT (store_id, subject) DO NOTHING;

  SELECT *
    INTO v_row
    FROM public.gift_card_attempt_limits
   WHERE store_id = p_store_id
     AND subject = trim(p_subject)
   FOR UPDATE;

  IF v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
    v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.blocked_until - v_now))));
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry
    );
  END IF;

  IF v_row.last_attempt_at IS NOT NULL
     AND v_row.last_attempt_at + v_min_gap > v_now THEN
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_row.last_attempt_at + v_min_gap - v_now)))
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry
    );
  END IF;

  IF v_row.window_started_at + v_window <= v_now THEN
    v_row.attempt_count := 0;
    v_row.failed_count := 0;
    v_row.window_started_at := v_now;
    v_row.blocked_until := NULL;
  END IF;

  IF v_row.attempt_count >= v_max_attempts OR v_row.failed_count >= v_max_failed THEN
    v_row.blocked_until := v_now + v_block;
    UPDATE public.gift_card_attempt_limits
       SET attempt_count = v_row.attempt_count,
           failed_count = v_row.failed_count,
           window_started_at = v_row.window_started_at,
           blocked_until = v_row.blocked_until,
           last_attempt_at = v_now,
           updated_at = v_now
     WHERE id = v_row.id;
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', CEIL(EXTRACT(EPOCH FROM v_block))::integer
    );
  END IF;

  UPDATE public.gift_card_attempt_limits
     SET attempt_count = v_row.attempt_count + 1,
         window_started_at = v_row.window_started_at,
         last_attempt_at = v_now,
         blocked_until = NULL,
         updated_at = v_now
   WHERE id = v_row.id;

  RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
END;
$$;

-- Marca el último intento como fallido (para el tope de 5 fallos).
CREATE OR REPLACE FUNCTION public.record_gift_card_attempt_failure(
  p_store_id UUID,
  p_subject TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed INTEGER;
  v_now TIMESTAMPTZ := now();
BEGIN
  UPDATE public.gift_card_attempt_limits
     SET failed_count = failed_count + 1,
         updated_at = v_now
   WHERE store_id = p_store_id
     AND subject = trim(p_subject)
  RETURNING failed_count INTO v_failed;

  IF v_failed IS NOT NULL AND v_failed >= 5 THEN
    UPDATE public.gift_card_attempt_limits
       SET blocked_until = v_now + INTERVAL '30 minutes',
           updated_at = v_now
     WHERE store_id = p_store_id
       AND subject = trim(p_subject);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_gift_card_rate_limit(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_gift_card_rate_limit(UUID, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_gift_card_attempt_failure(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_gift_card_attempt_failure(UUID, TEXT)
  TO service_role;
