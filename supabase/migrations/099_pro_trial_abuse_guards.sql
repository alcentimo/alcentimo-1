-- Blindaje anti-abuso de la prueba Pro:
-- 1) Flag permanente por tienda (stores.pro_trial_claimed_at)
-- 2) Registro único de correo/teléfono usados al reclamar

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pro_trial_claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.stores.pro_trial_claimed_at IS
  'Marca permanente: esta tienda ya reclamó la prueba Pro (no reutilizable).';

CREATE TABLE IF NOT EXISTS public.pro_trial_contact_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  contact_email_normalized TEXT,
  contact_phone_normalized TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pro_trial_contact_claims_store_unique UNIQUE (store_id),
  CONSTRAINT pro_trial_contact_claims_has_contact CHECK (
    contact_email_normalized IS NOT NULL OR contact_phone_normalized IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_trial_claims_email_unique
  ON public.pro_trial_contact_claims (contact_email_normalized)
  WHERE contact_email_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_trial_claims_phone_unique
  ON public.pro_trial_contact_claims (contact_phone_normalized)
  WHERE contact_phone_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pro_trial_claims_owner
  ON public.pro_trial_contact_claims (owner_user_id);

COMMENT ON TABLE public.pro_trial_contact_claims IS
  'Huellas de contacto usadas al reclamar la prueba Pro (email/teléfono únicos).';

ALTER TABLE public.pro_trial_contact_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_pro_trial_contact_claims" ON public.pro_trial_contact_claims;
CREATE POLICY "deny_all_pro_trial_contact_claims"
  ON public.pro_trial_contact_claims
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Normaliza teléfono al mismo criterio que WhatsApp (solo dígitos, VE → 58…).
CREATE OR REPLACE FUNCTION public.normalize_pro_trial_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(digits) < 10 THEN
    RETURN NULL;
  END IF;
  IF digits LIKE '58%' AND length(digits) >= 12 THEN
    RETURN digits;
  END IF;
  IF left(digits, 1) = '0' THEN
    RETURN '58' || substr(digits, 2);
  END IF;
  IF length(digits) = 10 THEN
    RETURN '58' || digits;
  END IF;
  RETURN digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_pro_trial_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(trim(coalesce(p_email, ''))), '');
$$;

CREATE OR REPLACE FUNCTION public.start_pro_trial(
  p_user_id UUID,
  p_claim_code TEXT DEFAULT NULL
)
RETURNS TABLE(ok BOOLEAN, error_message TEXT, trial_ends_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_started TIMESTAMPTZ;
  v_subscription_status TEXT;
  v_plan_norm TEXT;
  v_ends TIMESTAMPTZ;
  v_claim TEXT;
  v_store_id UUID;
  v_store_claimed_at TIMESTAMPTZ;
  v_email_norm TEXT;
  v_phone_norm TEXT;
  v_conflict_store UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT false, 'No autorizado.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_claim := upper(trim(coalesce(p_claim_code, '')));
  IF v_claim <> 'ALCENTIMO' THEN
    RETURN QUERY SELECT false, 'Escribe ALCENTIMO exactamente para reclamar tu mes gratis.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT s.id, s.pro_trial_claimed_at
  INTO v_store_id, v_store_claimed_at
  FROM public.stores s
  WHERE s.owner_id = p_user_id
  ORDER BY s.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_store_id IS NULL THEN
    RETURN QUERY SELECT false, 'Necesitas una tienda para activar la prueba Pro.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_store_claimed_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Esta tienda ya reclamó la prueba gratis del Plan Pro.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT plan, pro_trial_started_at, subscription_status
  INTO v_plan, v_started, v_subscription_status
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Perfil no encontrado.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_started IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Ya usaste tu mes de prueba Pro.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_plan_norm := upper(trim(coalesce(v_plan, 'FREE')));
  v_subscription_status := coalesce(v_subscription_status, 'none');

  IF v_subscription_status <> 'none' THEN
    RETURN QUERY SELECT false, 'La prueba gratuita requiere una cuenta sin suscripción activa.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_plan_norm <> 'FREE' THEN
    RETURN QUERY SELECT false, 'La prueba gratuita solo aplica al plan Gratis.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT public.normalize_pro_trial_email(u.email)
  INTO v_email_norm
  FROM auth.users u
  WHERE u.id = p_user_id;

  SELECT public.normalize_pro_trial_phone(
    coalesce(
      nullif(trim(ss.config #>> '{contact,whatsappPhone}'), ''),
      nullif(trim(ss.config #>> '{contact,whatsappPhones,0}'), '')
    )
  )
  INTO v_phone_norm
  FROM public.store_settings ss
  WHERE ss.store_id = v_store_id;

  IF v_phone_norm IS NULL THEN
    RETURN QUERY SELECT false,
      'Configura el WhatsApp principal de tu tienda antes de reclamar la prueba Pro.'::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_email_norm IS NULL THEN
    RETURN QUERY SELECT false,
      'Tu cuenta necesita un correo válido para reclamar la prueba Pro.'::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT c.store_id
  INTO v_conflict_store
  FROM public.pro_trial_contact_claims c
  WHERE c.contact_email_normalized = v_email_norm
    AND c.store_id <> v_store_id
  LIMIT 1;

  IF v_conflict_store IS NOT NULL THEN
    RETURN QUERY SELECT false,
      'Este correo de contacto ya se usó para reclamar la prueba Pro en otra tienda.'::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT c.store_id
  INTO v_conflict_store
  FROM public.pro_trial_contact_claims c
  WHERE c.contact_phone_normalized = v_phone_norm
    AND c.store_id <> v_store_id
  LIMIT 1;

  IF v_conflict_store IS NOT NULL THEN
    RETURN QUERY SELECT false,
      'Este número de teléfono ya se usó para reclamar la prueba Pro en otra tienda.'::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_ends := now() + interval '1 month';

  UPDATE public.profiles
  SET pro_trial_started_at = now(),
      pro_trial_ends_at = v_ends
  WHERE id = p_user_id;

  UPDATE public.stores
  SET pro_trial_claimed_at = now()
  WHERE id = v_store_id
    AND pro_trial_claimed_at IS NULL;

  INSERT INTO public.pro_trial_contact_claims (
    store_id,
    owner_user_id,
    contact_email_normalized,
    contact_phone_normalized,
    claimed_at
  )
  VALUES (
    v_store_id,
    p_user_id,
    v_email_norm,
    v_phone_norm,
    now()
  )
  ON CONFLICT (store_id) DO NOTHING;

  RETURN QUERY SELECT true, NULL::TEXT, v_ends;
END;
$$;

COMMENT ON FUNCTION public.start_pro_trial(UUID, TEXT) IS
  'Activa 1 mes de prueba Pro con anti-abuso: una vez por tienda/cuenta y email/teléfono únicos.';

REVOKE ALL ON FUNCTION public.start_pro_trial(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_pro_trial(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_pro_trial(p_user_id UUID)
RETURNS TABLE(ok BOOLEAN, error_message TEXT, trial_ends_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.start_pro_trial(p_user_id, NULL::TEXT);
END;
$$;

REVOKE ALL ON FUNCTION public.start_pro_trial(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_pro_trial(UUID) TO authenticated;

-- Backfill: perfiles que ya usaron la prueba → marcar tienda y registrar huellas si es posible.
WITH claimed AS (
  SELECT
    s.id AS store_id,
    s.owner_id,
    p.pro_trial_started_at AS claimed_at,
    public.normalize_pro_trial_email(u.email) AS email_norm,
    public.normalize_pro_trial_phone(
      coalesce(
        nullif(trim(ss.config #>> '{contact,whatsappPhone}'), ''),
        nullif(trim(ss.config #>> '{contact,whatsappPhones,0}'), '')
      )
    ) AS phone_norm
  FROM public.profiles p
  JOIN public.stores s ON s.owner_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.store_settings ss ON ss.store_id = s.id
  WHERE p.pro_trial_started_at IS NOT NULL
)
UPDATE public.stores s
SET pro_trial_claimed_at = COALESCE(s.pro_trial_claimed_at, c.claimed_at)
FROM claimed c
WHERE s.id = c.store_id
  AND s.pro_trial_claimed_at IS NULL;

INSERT INTO public.pro_trial_contact_claims (
  store_id,
  owner_user_id,
  contact_email_normalized,
  contact_phone_normalized,
  claimed_at
)
SELECT
  c.store_id,
  c.owner_id,
  c.email_norm,
  c.phone_norm,
  c.claimed_at
FROM (
  SELECT
    s.id AS store_id,
    s.owner_id,
    p.pro_trial_started_at AS claimed_at,
    public.normalize_pro_trial_email(u.email) AS email_norm,
    public.normalize_pro_trial_phone(
      coalesce(
        nullif(trim(ss.config #>> '{contact,whatsappPhone}'), ''),
        nullif(trim(ss.config #>> '{contact,whatsappPhones,0}'), '')
      )
    ) AS phone_norm
  FROM public.profiles p
  JOIN public.stores s ON s.owner_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.store_settings ss ON ss.store_id = s.id
  WHERE p.pro_trial_started_at IS NOT NULL
) c
WHERE c.email_norm IS NOT NULL OR c.phone_norm IS NOT NULL
ON CONFLICT (store_id) DO NOTHING;
