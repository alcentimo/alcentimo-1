-- ============================================================
-- alcentimo-1 — Tabla profiles + plan de suscripción
-- Ejecutar en el SQL Editor de Supabase (o vía CLI).
-- ============================================================

-- 1. TABLA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'FREE',

  CONSTRAINT profiles_plan_check
    CHECK (upper(plan) IN ('FREE', 'STARTER', 'GROWTH', 'PREMIUM'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles (plan);

-- Perfiles para usuarios que ya existían antes de esta migración
INSERT INTO public.profiles (id, plan)
SELECT id, 'FREE'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_select_store_owner ON public.profiles;
CREATE POLICY profiles_select_store_owner
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores s
      INNER JOIN public.store_members sm ON sm.store_id = s.id
      WHERE s.owner_id = profiles.id
        AND sm.user_id = auth.uid()
    )
  );

-- 3. FUNCIÓN: insertar perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, plan)
  VALUES (NEW.id, 'FREE')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. TRIGGER en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();
