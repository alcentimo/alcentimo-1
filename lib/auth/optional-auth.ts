import type { AuthError } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/** Errores esperables cuando no hay sesión (visitante anónimo, login, cookies expiradas). */
export function isOptionalAuthError(error: AuthError | null | undefined): boolean {
  if (!error) return false;

  const message = error.message.toLowerCase();

  return (
    message.includes("auth session missing") ||
    message.includes("session not found") ||
    message.includes("invalid jwt") ||
    message.includes("jwt expired") ||
    error.status === 401 ||
    error.status === 403
  );
}

/**
 * Lee el usuario actual sin lanzar cuando no hay sesión activa.
 * Usar en layouts/páginas públicas del dashboard (p. ej. login).
 */
export async function getOptionalAuthUser(client: {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null };
      error: AuthError | null;
    }>;
  };
}): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (!user) return null;

  if (error && !isOptionalAuthError(error)) {
    throw new Error(error.message);
  }

  return user;
}
