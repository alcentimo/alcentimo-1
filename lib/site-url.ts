const DEFAULT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * URL pública de la app. En producción define NEXT_PUBLIC_SITE_URL=https://alcentimo.com
 */
export function getSiteUrl(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return normalizeSiteUrl(fromEnv);
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

    if (forwardedHost) {
      return normalizeSiteUrl(`${forwardedProto}://${forwardedHost}`);
    }

    return normalizeSiteUrl(new URL(request.url).origin);
  }

  if (typeof window !== "undefined") {
    return normalizeSiteUrl(window.location.origin);
  }

  return DEFAULT_SITE_URL;
}

export function getAuthCallbackUrl(next = "/onboarding", request?: Request): string {
  const siteUrl = getSiteUrl(request);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  return `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
