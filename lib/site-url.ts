const DEFAULT_SITE_URL = "https://alcentimo.com";

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** NEXT_PUBLIC_SITE_URL válida para producción (ignora localhost embebido en build). */
function siteUrlFromEnv(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!fromEnv || isLocalhostUrl(fromEnv)) return null;
  return normalizeSiteUrl(fromEnv);
}

/**
 * URL pública de la app.
 * - Cliente: NEXT_PUBLIC_SITE_URL → window.location.origin → alcentimo.com
 * - Servidor: NEXT_PUBLIC_SITE_URL → alcentimo.com
 */
export function getSiteUrl(): string {
  const fromEnv = siteUrlFromEnv();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    return normalizeSiteUrl(window.location.origin);
  }

  return DEFAULT_SITE_URL;
}

/** Host apex sin protocolo (ej. alcentimo.com). */
export function getApexSiteHost(): string {
  return getPublicSiteHost();
}

/** Host público sin protocolo (ej. alcentimo.com). */
export function getPublicSiteHost(): string {
  return getSiteUrl().replace(/^https?:\/\//, "");
}

/** Callback OAuth/email: p. ej. https://alcentimo.com/auth/callback?next=...&store=mi-tienda */
export function getAuthCallbackUrl(
  next = "/onboarding",
  extraParams?: Record<string, string | undefined>,
): string {
  const siteUrl = getSiteUrl();
  const safeNext =
    next.startsWith("http://") ||
    next.startsWith("https://") ||
    (next.startsWith("/") && !next.startsWith("//"))
      ? next
      : "/onboarding";
  const params = new URLSearchParams({ next: safeNext });

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      const trimmed = value?.trim();
      if (trimmed) params.set(key, trimmed);
    }
  }

  return `${siteUrl}/auth/callback?${params.toString()}`;
}

/** Destino del enlace de recuperación (Supabase añade token_hash/type o code). */
export function getPasswordResetRedirectUrl(): string {
  const siteUrl = getSiteUrl();
  return `${siteUrl}/auth/confirm?next=${encodeURIComponent("/dashboard/restablecer-contrasena")}`;
}
