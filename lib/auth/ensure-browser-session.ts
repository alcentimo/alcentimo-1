import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { logAuthEvent } from "@/lib/auth/auth-log";

const RETRY_DELAYS_MS = [0, 120, 280, 500] as const;

async function sessionFromStorage(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (session?.access_token && !sessionError) {
    return true;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  return Boolean(user && !userError);
}

/**
 * Confirma que la sesión quedó usable en el navegador tras login.
 * Si el signIn devolvió tokens pero el storage/cookies aún no responden,
 * reescribe la sesión con setSession y reintenta (común en móvil / hosts preview).
 */
export async function ensureBrowserSessionReady(
  supabase: SupabaseClient,
  preferredSession?: Session | null,
): Promise<boolean> {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (await sessionFromStorage(supabase)) {
      return true;
    }

    // Reintento de persistencia: fuerza escritura de cookies/storage.
    if (
      preferredSession?.access_token &&
      preferredSession.refresh_token &&
      attempt === 1
    ) {
      const { error: setError } = await supabase.auth.setSession({
        access_token: preferredSession.access_token,
        refresh_token: preferredSession.refresh_token,
      });
      if (setError) {
        logAuthEvent(
          "signin_set_session_failed",
          { message: setError.message },
          "warn",
        );
      }
    }
  }

  // Último recurso: si el login trajo sesión válida, permitir continuar;
  // las cookies deberían haberse escrito en setSession / signIn.
  if (preferredSession?.access_token && preferredSession.refresh_token) {
    logAuthEvent(
      "signin_session_preferred_fallback",
      { hasPreferredSession: true },
      "warn",
    );
    return true;
  }

  logAuthEvent(
    "signin_session_not_ready",
    { hadPreferredSession: Boolean(preferredSession) },
    "warn",
  );
  return false;
}
