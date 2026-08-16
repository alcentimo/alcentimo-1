import {
  checkSupportAdminAccess,
  resolveAuthEmail,
  type SupportAdminDenyReason,
} from "@/lib/support/admin-access";
import type { User } from "@supabase/supabase-js";

/** Marca centralizada de la vitrina (un solo vendedor: el administrador). */
export const MORICHE_BRAND_LABEL = "Moriche";

const MERCADO_PREFIX = "/mercado-oculto";

/**
 * Rutas de vitrina públicas: catálogo, ficha y carrito (solo lectura/edición local).
 * Compra / checkout / chat requieren sesión.
 */
export function isMercadoPublicBrowsePath(pathname: string): boolean {
  if (pathname === MERCADO_PREFIX || pathname === `${MERCADO_PREFIX}/`) {
    return true;
  }
  if (pathname.startsWith(`${MERCADO_PREFIX}/producto/`)) {
    return true;
  }
  if (
    pathname === `${MERCADO_PREFIX}/carrito` ||
    pathname.startsWith(`${MERCADO_PREFIX}/carrito/`)
  ) {
    return true;
  }
  return false;
}

/** Pedidos, chat y cualquier ruta de cierre de compra. */
export function isMercadoPurchaseAuthPath(pathname: string): boolean {
  if (!pathname.startsWith(MERCADO_PREFIX)) return false;
  return !isMercadoPublicBrowsePath(pathname);
}

export function buildMercadoLoginHref(nextPath: string): string {
  const next = nextPath.trim() || MERCADO_PREFIX;
  return `/dashboard/login?next=${encodeURIComponent(next)}`;
}

/**
 * Acceso de gestión (panel interno) al mercado: Administrador General.
 * La vitrina pública ya no usa este gate para navegar el catálogo.
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
