-- Permite activar la prueba Pro con plan FREE (normalizado) o tras revertir acceso provisional.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';

CREATE OR REPLACE FUNCTION public.start_pro_trial(p_user_id UUID)
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
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT false, 'No autorizado.'::TEXT, NULL::TIMESTAMPTZ;
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

  IF v_subscription_status = 'active' THEN
    RETURN QUERY SELECT false, 'Ya tienes una suscripción activa.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_plan_norm <> 'FREE' THEN
    IF v_subscription_status IN ('provisional', 'none') THEN
      UPDATE public.profiles
      SET plan = 'FREE',
          subscription_status = 'none'
      WHERE id = p_user_id;
      v_plan_norm := 'FREE';
    ELSE
      RETURN QUERY SELECT false, 'La prueba gratuita solo aplica al plan Gratis.'::TEXT, NULL::TIMESTAMPTZ;
      RETURN;
    END IF;
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
