-- Fix: accept/preview_store_invitation fallaban con
--   function digest(text, unknown) does not exist
-- porque las funciones SECURITY DEFINER fijaban search_path = public
-- y en Supabase pgcrypto (digest) vive en el schema extensions.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.preview_store_invitation(p_token TEXT)
RETURNS TABLE (
  invitation_id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  email TEXT,
  role TEXT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  is_revoked BOOLEAN,
  is_accepted BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN;
  END IF;

  v_hash := encode(digest(convert_to(trim(p_token), 'UTF8'), 'sha256'), 'hex');

  RETURN QUERY
  SELECT
    si.id,
    si.store_id,
    s.name,
    s.slug,
    si.email,
    si.role,
    si.expires_at,
    (si.expires_at <= now()) AS is_expired,
    (si.revoked_at IS NOT NULL) AS is_revoked,
    (si.accepted_at IS NOT NULL) AS is_accepted
  FROM public.store_invitations si
  INNER JOIN public.stores s ON s.id = si.store_id
  WHERE si.token_hash = v_hash
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_store_invitation(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_store_invitation(p_token TEXT)
RETURNS TABLE (
  store_id UUID,
  member_id UUID,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_hash TEXT;
  v_inv public.store_invitations%ROWTYPE;
  v_member_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  SELECT lower(trim(u.email))
  INTO v_user_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RAISE EXCEPTION 'Tu cuenta no tiene correo verificado.';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Invitación inválida.';
  END IF;

  v_hash := encode(digest(convert_to(trim(p_token), 'UTF8'), 'sha256'), 'hex');

  SELECT *
  INTO v_inv
  FROM public.store_invitations si
  WHERE si.token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada.';
  END IF;

  IF v_inv.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Esta invitación fue revocada.';
  END IF;

  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Esta invitación ya fue aceptada.';
  END IF;

  IF v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Esta invitación expiró.';
  END IF;

  IF lower(trim(v_inv.email)) <> v_user_email THEN
    RAISE EXCEPTION 'Esta invitación fue enviada a otro correo.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.store_members sm
    WHERE sm.store_id = v_inv.store_id
      AND sm.user_id = v_user_id
  ) THEN
    UPDATE public.store_invitations
    SET accepted_at = now()
    WHERE id = v_inv.id;

    SELECT sm.id
    INTO v_member_id
    FROM public.store_members sm
    WHERE sm.store_id = v_inv.store_id
      AND sm.user_id = v_user_id;

    RETURN QUERY
    SELECT v_inv.store_id, v_member_id, (
      SELECT sm.role FROM public.store_members sm WHERE sm.id = v_member_id
    );
    RETURN;
  END IF;

  INSERT INTO public.store_members (
    store_id,
    user_id,
    role,
    invited_by,
    invited_at,
    accepted_at
  )
  VALUES (
    v_inv.store_id,
    v_user_id,
    v_inv.role,
    v_inv.invited_by,
    v_inv.created_at,
    now()
  )
  RETURNING id INTO v_member_id;

  UPDATE public.store_invitations
  SET accepted_at = now()
  WHERE id = v_inv.id;

  RETURN QUERY
  SELECT v_inv.store_id, v_member_id, v_inv.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_store_invitation(TEXT) TO authenticated;
