-- ============================================================
-- alcentimo-1 — Asegurar perfil FREE (p. ej. tras OAuth con Google)
-- ============================================================

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

  INSERT INTO public.profiles (id, plan)
  VALUES (auth.uid(), 'FREE')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
