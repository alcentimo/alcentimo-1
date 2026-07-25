-- Invitaciones de equipo y metadatos opcionales en store_members.

CREATE TABLE IF NOT EXISTS public.store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('admin', 'staff')),
  token_hash TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT store_invitations_email_format
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

COMMENT ON TABLE public.store_invitations IS
  'Invitaciones pendientes para unirse al equipo de una tienda.';
COMMENT ON COLUMN public.store_invitations.token_hash IS
  'SHA-256 hex del token enviado al invitado (nunca guardar el token en claro).';

CREATE INDEX IF NOT EXISTS idx_store_invitations_store
  ON public.store_invitations (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_invitations_token_hash
  ON public.store_invitations (token_hash)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_invitations_pending_email_unique
  ON public.store_invitations (store_id, lower(trim(email)))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.store_members
  ADD COLUMN IF NOT EXISTS invited_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.store_members.invited_by IS
  'Usuario que envió la invitación (NULL si es el dueño registrado al crear la tienda).';

-- Cuenta miembros activos + invitaciones pendientes no vencidas.
CREATE OR REPLACE FUNCTION public.count_store_team_slots(p_store_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.store_members sm
      WHERE sm.store_id = p_store_id
    ), 0)
    + COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.store_invitations si
      WHERE si.store_id = p_store_id
        AND si.accepted_at IS NULL
        AND si.revoked_at IS NULL
        AND si.expires_at > now()
    ), 0);
$$;

COMMENT ON FUNCTION public.count_store_team_slots(UUID) IS
  'Miembros actuales más invitaciones pendientes vigentes (para límites de plan).';

ALTER TABLE public.store_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_invitations_members_read ON public.store_invitations;
CREATE POLICY store_invitations_members_read
  ON public.store_invitations FOR SELECT
  TO authenticated
  USING (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS store_invitations_admins_manage ON public.store_invitations;
CREATE POLICY store_invitations_admins_manage
  ON public.store_invitations FOR ALL
  TO authenticated
  USING (public.is_store_admin(store_id))
  WITH CHECK (public.is_store_admin(store_id));

-- Vista previa segura de una invitación por token (sin exponer el hash).
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
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN;
  END IF;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

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

-- Aceptar invitación: crea store_members si el email coincide y hay cupo (validado en app).
CREATE OR REPLACE FUNCTION public.accept_store_invitation(p_token TEXT)
RETURNS TABLE (
  store_id UUID,
  member_id UUID,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

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
