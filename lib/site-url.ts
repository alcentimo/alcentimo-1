const DEFAULT_SITE_URL = "https://alcentimo.com";

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** URL pública de la app desde NEXT_PUBLIC_SITE_URL o https://alcentimo.com. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return normalizeSiteUrl(fromEnv || DEFAULT_SITE_URL);
}

export function getAuthCallbackUrl(next = "/onboarding"): string {
  const siteUrl = getSiteUrl();
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  return `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
