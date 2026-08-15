/** Aplica un destino `next` interno (path + query opcional) a una URL de redirección. */
export function applySafeInternalNextRedirect(
  redirectUrl: URL,
  next: string | null | undefined,
  fallbackPath: string,
): void {
  if (!next?.trim()) {
    redirectUrl.pathname = fallbackPath;
    redirectUrl.search = "";
    return;
  }

  const trimmed = next.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//")
  ) {
    redirectUrl.pathname = fallbackPath;
    redirectUrl.search = "";
    return;
  }

  const queryIndex = trimmed.indexOf("?");
  const pathnameOnly =
    queryIndex >= 0 ? trimmed.slice(0, queryIndex) || fallbackPath : trimmed;
  const search = queryIndex >= 0 ? trimmed.slice(queryIndex) : "";

  // /dashboard solo redirige a catálogo; usar el fallback evita un hop extra.
  if (pathnameOnly === "/dashboard" || pathnameOnly === "/dashboard/") {
    redirectUrl.pathname = fallbackPath;
    redirectUrl.search = search;
    return;
  }

  redirectUrl.pathname = pathnameOnly;
  redirectUrl.search = search;
}

/** Destino por defecto tras login: catálogo (middleware manda a /onboarding si no hay tienda). */
export const DEFAULT_POST_AUTH_PATH = "/dashboard/catalogo";

/** Panel de carga de productos para mayoristas / proveedores. */
export const SUPPLIER_POST_AUTH_PATH = "/proveedor/dashboard";

export function resolvePostAuthPath(next: string | null | undefined): string {
  if (!next?.trim()) return DEFAULT_POST_AUTH_PATH;
  const trimmed = next.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://")
  ) {
    // Evitar /dashboard → redirect extra a /dashboard/catalogo.
    if (trimmed === "/dashboard" || trimmed === "/dashboard/") {
      return DEFAULT_POST_AUTH_PATH;
    }
    return trimmed;
  }
  return DEFAULT_POST_AUTH_PATH;
}

/**
 * Destino post-login considerando rol de proveedor (allowlist).
 * Los mayoristas van al panel de carga de productos, salvo que pidan
 * explícitamente otra ruta válida (invitación, admin, /proveedor, /c/).
 */
export function resolvePostAuthPathForUser(input: {
  next?: string | null;
  isSupplier?: boolean;
}): string {
  const next = input.next?.trim() || null;
  const resolved = resolvePostAuthPath(next);

  if (!input.isSupplier) return resolved;

  if (resolved.startsWith("/proveedor")) return resolved;
  if (isInvitationNextPath(next) || isInvitationNextPath(resolved)) {
    return resolved;
  }
  if (
    resolved.startsWith("/admin") ||
    resolved.startsWith("/mercado-oculto") ||
    resolved.startsWith("/c/")
  ) {
    return resolved;
  }

  return SUPPLIER_POST_AUTH_PATH;
}

export function isInvitationNextPath(next: string | null | undefined): boolean {
  if (!next) return false;
  return next.includes("/dashboard/invitacion");
}
