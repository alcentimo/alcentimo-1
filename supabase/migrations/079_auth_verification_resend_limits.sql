-- ============================================================
-- alcentimo-1 — Límites de reenvío de código de verificación
-- Cooldown 2 min, máx. 3 reenvíos, bloqueo 15 min
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auth_verification_resend_limits (
  email text PRIMARY KEY,
  resend_count integer NOT NULL DEFAULT 0 CHECK (resend_count >= 0 AND resend_count <= 3),
  last_resend_at timestamptz,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auth_verification_resend_limits IS
  'Rate limits para reenvío de código OTP de verificación de cuenta (por email).';

ALTER TABLE public.auth_verification_resend_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.auth_verification_resend_limits FROM PUBLIC;
GRANT ALL ON public.auth_verification_resend_limits TO service_role;
