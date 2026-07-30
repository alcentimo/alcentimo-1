-- Prueba Pro: exige la palabra ALCENTIMO en el RPC (además de FREE + subscription_status none).

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

  v_ends := now() + interval '1 month';

  -- El plan permanece FREE; los límites Pro se aplican mientras pro_trial_ends_at > now().
  UPDATE public.profiles
  SET pro_trial_started_at = now(),
      pro_trial_ends_at = v_ends
  WHERE id = p_user_id;

  RETURN QUERY SELECT true, NULL::TEXT, v_ends;
END;
$$;

COMMENT ON FUNCTION public.start_pro_trial(UUID, TEXT) IS
  'Activa 1 mes de prueba Pro para cuentas FREE (subscription_status=none) tras validar ALCENTIMO.';

REVOKE ALL ON FUNCTION public.start_pro_trial(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_pro_trial(UUID, TEXT) TO authenticated;

-- Compatibilidad: firma anterior de un solo argumento (sin claim) queda bloqueada.
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

-- Cuentas nuevas: FREE + subscription_status none (elegibles a la prueba Pro).
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, plan, subscription_status)
  VALUES (auth.uid(), 'FREE', 'none')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
