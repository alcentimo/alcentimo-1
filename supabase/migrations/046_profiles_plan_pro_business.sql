-- Sincroniza nombres comerciales (Pro / Business) con profiles.plan en BD.

UPDATE public.profiles
SET plan = 'PRO'
WHERE upper(trim(plan)) IN ('STARTER', 'GROWTH');

UPDATE public.profiles
SET plan = 'BUSINESS'
WHERE upper(trim(plan)) = 'PREMIUM';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (upper(trim(plan)) IN ('FREE', 'PRO', 'BUSINESS'));

COMMENT ON COLUMN public.profiles.plan IS
  'Plan de suscripción: FREE (Gratis), PRO (250 productos), BUSINESS (ilimitado).';
