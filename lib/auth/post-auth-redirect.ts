const AUTH_TRANSIENT_QUERY_KEYS = [
  "code",
  "token_hash",
  "type",
  "error",
  "error_code",
  "error_description",
] as const;

/**
 * Construye un destino `next` relativo (path + query) para volver tras login/signup.
 * Omite params transitorios de Supabase Auth para no contaminar el retorno.
 */
export function buildLoginReturnTo(
  pathname: string,
  search: string | null | undefined = "",
): string {
  const rawPath = pathname?.trim() || "/";
  if (
    rawPath.startsWith("http://") ||
    rawPath.startsWith("https://") ||
    !rawPath.startsWith("/") ||
    rawPath.startsWith("//")
  ) {
    return "/";
  }

  const rawSearch = search?.trim() ?? "";
  if (!rawSearch || rawSearch === "?") {
    return rawPath;
  }

  const params = new URLSearchParams(
    rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch,
  );
  for (const key of AUTH_TRANSIENT_QUERY_KEYS) {
    params.delete(key);
  }

  const qs = params.toString();
  return qs ? `${rawPath}?${qs}` : rawPath;
}

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
  if (queryIndex >= 0) {
    redirectUrl.pathname = trimmed.slice(0, queryIndex) || fallbackPath;
    redirectUrl.search = trimmed.slice(queryIndex);
    return;
  }

  redirectUrl.pathname = trimmed;
  redirectUrl.search = "";
}

export function resolvePostAuthPath(next: string | null | undefined): string {
  if (!next?.trim()) return "/onboarding";
  const trimmed = next.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return "/onboarding";
}

export function isInvitationNextPath(next: string | null | undefined): boolean {
  if (!next) return false;
  return next.includes("/dashboard/invitacion");
}
