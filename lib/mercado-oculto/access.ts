import {
  checkSupportAdminAccess,
  resolveAuthEmail,
  type SupportAdminDenyReason,
} from "@/lib/support/admin-access";
import type { User } from "@supabase/supabase-js";

/**
 * Acceso exclusivo al mercado oculto: Administrador General (Super Admin)
 * vía allowlist SUPPORT_ADMIN_EMAILS. No disponible para suscriptores ni clientes.
 */
export function hasMercadoOcultoSuperAdminAccess(
  email: string | null | undefined,
): boolean {
  return checkSupportAdminAccess(email).ok;
}

export function hasMercadoOcultoSuperAdminUser(
  user:
    | Pick<User, "email" | "user_metadata">
    | { email?: string | null }
    | null
    | undefined,
): boolean {
  if (!user) return false;
  if ("user_metadata" in user) {
    return hasMercadoOcultoSuperAdminAccess(
      resolveAuthEmail(user as Pick<User, "email" | "user_metadata">),
    );
  }
  return hasMercadoOcultoSuperAdminAccess(user.email);
}

export type MercadoAccessDenialReason =
  | "unauthenticated"
  | SupportAdminDenyReason;

export function resolveMercadoOcultoDenial(
  user: Pick<User, "email" | "user_metadata"> | null | undefined,
): MercadoAccessDenialReason | null {
  if (!user) return "unauthenticated";
  const check = checkSupportAdminAccess(resolveAuthEmail(user));
  if (check.ok) return null;
  return check.reason ?? "not_listed";
}
