import type { CookieOptions } from "@supabase/ssr";
import { getApexSiteHost } from "@/lib/site-url";
import { isStoreSubdomainCatalogEnabled } from "@/lib/store-host";

function normalizeHostname(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  const host = hostname.split(":")[0]?.trim().toLowerCase();
  return host || null;
}

/** True si el host actual puede usar cookies con Domain=.apex (apex, www o tienda.*). */
export function canUseApexAuthCookieDomain(
  hostname: string | null | undefined,
  apexHost: string,
): boolean {
  const host = normalizeHostname(hostname);
  if (!host || !apexHost) return false;
  return (
    host === apexHost ||
    host === `www.${apexHost}` ||
    host.endsWith(`.${apexHost}`)
  );
}

function resolveRequestHostname(
  hostname?: string | null,
): string | null {
  const explicit = normalizeHostname(hostname);
  if (explicit) return explicit;
  if (typeof window !== "undefined") {
    return normalizeHostname(window.location.hostname);
  }
  return null;
}

function isSecureContext(hostname?: string | null): boolean {
  if (typeof window !== "undefined") {
    return window.location.protocol === "https:";
  }
  const host = normalizeHostname(hostname);
  if (!host) return true;
  return !host.includes("localhost") && host !== "127.0.0.1";
}

/**
 * Opciones de cookie de auth.
 * - En apex / subdominios de tienda: Domain=.apex para compartir sesión.
 * - En preview u otros hosts: cookies solo del host actual (si se fuerza Domain=.apex
 *   el navegador las rechaza y el login parece “iniciado” sin sesión).
 */
export function getSupabaseCookieOptions(
  hostname?: string | null,
): CookieOptions | undefined {
  if (!isStoreSubdomainCatalogEnabled()) {
    return undefined;
  }

  const apexHost = getApexSiteHost();
  if (!apexHost || apexHost.includes("localhost")) {
    return undefined;
  }

  const requestHost = resolveRequestHostname(hostname);
  const secure = isSecureContext(requestHost);

  if (requestHost && !canUseApexAuthCookieDomain(requestHost, apexHost)) {
    return {
      path: "/",
      sameSite: "lax",
      secure,
    };
  }

  return {
    domain: `.${apexHost}`,
    path: "/",
    sameSite: "lax",
    secure,
  };
}
