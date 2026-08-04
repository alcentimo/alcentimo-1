-- Cierre manual de la prueba Pro por admin (sin auto-downgrade tras gracia).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_trial_closed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.pro_trial_closed_at IS
  'Cuando un admin cierra la prueba/prórroga y aplica Plan Gratis. NULL = beneficios Pro siguen (activa, gracia o revisión).';
