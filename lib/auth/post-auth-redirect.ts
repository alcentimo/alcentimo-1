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

  // /dashboard y el antiguo /onboarding van al panel principal.
  if (
    pathnameOnly === "/dashboard" ||
    pathnameOnly === "/dashboard/" ||
    pathnameOnly === "/onboarding" ||
    pathnameOnly === "/onboarding/"
  ) {
    redirectUrl.pathname = fallbackPath;
    redirectUrl.search = search;
    return;
  }

  redirectUrl.pathname = pathnameOnly;
  redirectUrl.search = search;
}

/** Destino por defecto tras login: catálogo (se crea una tienda genérica si aún no existe). */
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
    // Evitar /dashboard u /onboarding → extra hop; ir al panel.
    if (
      trimmed === "/dashboard" ||
      trimmed === "/dashboard/" ||
      trimmed === "/onboarding" ||
      trimmed === "/onboarding/"
    ) {
      return DEFAULT_POST_AUTH_PATH;
    }
    return trimmed;
  }
  return DEFAULT_POST_AUTH_PATH;
}

/** Origen del botón / pantalla de login. */
export type LoginIntent = "merchant" | "supplier" | "customer";

export type PostLoginAccountFacts = {
  next?: string | null;
  /** Si falta, se infiere por `next` (/proveedor → supplier). */
  intent?: LoginIntent | null;
  isSupplier?: boolean;
  hasMerchantStore?: boolean;
  /** Proveedor autorizado a usar el panel /dashboard (modo tienda). */
  supplierStoreMode?: boolean;
  customerAccountPath?: string | null;
};

function inferLoginIntent(
  next: string | null,
  intent?: LoginIntent | null,
): LoginIntent | "unspecified" {
  if (intent) return intent;
  if (next?.startsWith("/proveedor")) return "supplier";
  if (next?.startsWith("/c/") || next === "/cuenta" || next?.startsWith("/cuenta/")) {
    return "customer";
  }
  return "unspecified";
}

function canUseMerchantDashboard(input: PostLoginAccountFacts): boolean {
  return Boolean(input.hasMerchantStore || input.supplierStoreMode);
}

/**
 * Destino post-login según rol y origen del acceso.
 * El login de tienda/cliente no envía al hub de proveedores salvo `next` explícito.
 */
export function pickPostLoginPath(input: PostLoginAccountFacts): string {
  const next = input.next?.trim() || null;
  if (isInvitationNextPath(next)) {
    return resolvePostAuthPath(next);
  }

  const resolved = resolvePostAuthPath(next);
  if (
    resolved.startsWith("/admin") ||
    resolved.startsWith("/mercado-oculto")
  ) {
    return resolved;
  }

  const intent = inferLoginIntent(next, input.intent);
  const wantsSupplierHub = Boolean(next?.startsWith("/proveedor"));
  const customerPath = input.customerAccountPath?.trim() || null;

  if (intent === "supplier") {
    if (input.isSupplier) return SUPPLIER_POST_AUTH_PATH;
    if (canUseMerchantDashboard(input)) return DEFAULT_POST_AUTH_PATH;
    if (customerPath) return customerPath;
    return DEFAULT_POST_AUTH_PATH;
  }

  if (intent === "customer") {
    if (customerPath) return customerPath;
    return resolved.startsWith("/proveedor") ? DEFAULT_POST_AUTH_PATH : resolved;
  }

  // Login de tienda (`/dashboard/login`) u origen no marcado.
  if (intent === "merchant") {
    if (wantsSupplierHub && input.isSupplier) return SUPPLIER_POST_AUTH_PATH;
    if (canUseMerchantDashboard(input)) {
      return resolved.startsWith("/dashboard") ? resolved : DEFAULT_POST_AUTH_PATH;
    }
    if (customerPath) return customerPath;
    return resolved.startsWith("/proveedor") ? DEFAULT_POST_AUTH_PATH : resolved;
  }

  if (wantsSupplierHub && input.isSupplier) return SUPPLIER_POST_AUTH_PATH;
  if (canUseMerchantDashboard(input)) {
    return resolved.startsWith("/dashboard") ? resolved : DEFAULT_POST_AUTH_PATH;
  }
  if (customerPath) return customerPath;
  if (input.isSupplier) return SUPPLIER_POST_AUTH_PATH;
  return resolved.startsWith("/proveedor") ? DEFAULT_POST_AUTH_PATH : resolved;
}

/** @deprecated Preferir pickPostLoginPath (rol + origen). */
export function resolvePostAuthPathForUser(input: {
  next?: string | null;
  isSupplier?: boolean;
}): string {
  return pickPostLoginPath({
    next: input.next,
    isSupplier: input.isSupplier,
    intent: input.isSupplier ? "supplier" : "merchant",
  });
}

export function isInvitationNextPath(next: string | null | undefined): boolean {
  if (!next) return false;
  return next.includes("/dashboard/invitacion");
}
