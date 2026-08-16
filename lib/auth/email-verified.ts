import type { User } from "@supabase/supabase-js";

/** True si Auth ya confirmó el correo (email_confirmed_at). */
export function isAuthEmailVerified(
  user: Pick<User, "email_confirmed_at"> | null | undefined,
): boolean {
  return Boolean(user?.email_confirmed_at);
}

export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  "Debes confirmar tu correo electrónico antes de acceder. Revisa tu bandeja de entrada y spam.";

export const EMAIL_VERIFICATION_SENT_MESSAGE =
  "Te enviamos un enlace de confirmación a tu correo. Verifica tu bandeja (y spam) antes de iniciar sesión.";
