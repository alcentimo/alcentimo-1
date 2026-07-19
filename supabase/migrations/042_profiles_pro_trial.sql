-- Prueba gratuita de 1 mes del plan Pro (250 productos) para dueños en plan FREE.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.pro_trial_started_at IS
  'Marca de inicio de la prueba Pro gratuita (una sola vez por cuenta).';
COMMENT ON COLUMN public.profiles.pro_trial_ends_at IS
  'Fin de la prueba Pro; mientras sea > now() aplica el límite de 250 productos.';

CREATE OR REPLACE FUNCTION public.start_pro_trial(p_user_id UUID)
RETURNS TABLE(ok BOOLEAN, error_message TEXT, trial_ends_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_started TIMESTAMPTZ;
  v_ends TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT false, 'No autorizado.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT plan, pro_trial_started_at
  INTO v_plan, v_started
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Perfil no encontrado.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF upper(v_plan) <> 'FREE' THEN
    RETURN QUERY SELECT false, 'La prueba gratuita solo aplica al plan Gratis.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_started IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Ya usaste tu mes de prueba Pro.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_ends := now() + interval '1 month';

  UPDATE public.profiles
  SET pro_trial_started_at = now(),
      pro_trial_ends_at = v_ends
  WHERE id = p_user_id;

  RETURN QUERY SELECT true, NULL::TEXT, v_ends;
END;
$$;

REVOKE ALL ON FUNCTION public.start_pro_trial(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_pro_trial(UUID) TO authenticated;
