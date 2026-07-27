-- ============================================================
-- alcentimo-1 — Límites de reenvío por flujo (signup / recovery)
-- ============================================================

ALTER TABLE public.auth_verification_resend_limits
  ADD COLUMN IF NOT EXISTS flow text NOT NULL DEFAULT 'signup'
    CHECK (flow IN ('signup', 'recovery'));

ALTER TABLE public.auth_verification_resend_limits
  DROP CONSTRAINT IF EXISTS auth_verification_resend_limits_pkey;

ALTER TABLE public.auth_verification_resend_limits
  ADD PRIMARY KEY (email, flow);

COMMENT ON TABLE public.auth_verification_resend_limits IS
  'Rate limits para reenvío de correos de autenticación (verificación de cuenta y recuperación de contraseña).';

COMMENT ON COLUMN public.auth_verification_resend_limits.flow IS
  'Flujo: signup (confirmación de cuenta) o recovery (restablecer contraseña).';
