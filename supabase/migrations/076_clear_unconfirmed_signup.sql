-- ============================================================
-- alcentimo-1 — Limpiar registros de signup no confirmados
-- Permite re-registro inmediato cuando email_confirmed_at IS NULL
-- ============================================================

CREATE OR REPLACE FUNCTION public.clear_unconfirmed_signup(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_confirmed_at timestamptz;
  v_has_store boolean;
BEGIN
  v_email := lower(trim(coalesce(p_email, '')));

  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'invalid_email',
      'user_id', null
    );
  END IF;

  SELECT u.id, u.email_confirmed_at
  INTO v_user_id, v_confirmed_at
  FROM auth.users u
  WHERE lower(u.email) = v_email
  ORDER BY u.created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'not_found',
      'user_id', null
    );
  END IF;

  -- Cuenta ya verificada: no tocar.
  IF v_confirmed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'already_confirmed',
      'user_id', v_user_id
    );
  END IF;

  -- Seguridad: no borrar si ya es dueño de una tienda.
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.owner_id = v_user_id
  )
  INTO v_has_store;

  IF v_has_store THEN
    RETURN jsonb_build_object(
      'status', 'blocked_has_store',
      'user_id', v_user_id
    );
  END IF;

  -- Identidades primero (evita residuos en algunos entornos GoTrue).
  DELETE FROM auth.identities WHERE user_id = v_user_id;

  -- profiles y otras tablas con ON DELETE CASCADE se limpian solas.
  DELETE FROM auth.users
  WHERE id = v_user_id
    AND email_confirmed_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_confirmed',
      'user_id', v_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'cleared',
    'user_id', v_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.clear_unconfirmed_signup(text) IS
  'Elimina un usuario de auth.users solo si email_confirmed_at IS NULL y no es dueño de tienda. Usado para reintentar el registro.';

REVOKE ALL ON FUNCTION public.clear_unconfirmed_signup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_unconfirmed_signup(text) TO service_role;
