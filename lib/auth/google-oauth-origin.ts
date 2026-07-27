import { getApexSiteHost } from "@/lib/site-url";
import { parseStoreSlugFromHost } from "@/lib/store-host";

/** Orígenes donde Google Identity Services puede ejecutarse (registrados en Google Cloud). */
export function isGoogleOAuthAuthorizedOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    const apexHost = getApexSiteHost();

    if (hostname === apexHost || hostname === `www.${apexHost}`) {
      return true;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Subdominios de tienda y dominios personalizados deben delegar OAuth al apex. */
export function shouldUseCentralizedGoogleAuth(origin?: string): boolean {
  const currentOrigin =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");

  if (!currentOrigin) return false;
  return !isGoogleOAuthAuthorizedOrigin(currentOrigin);
}

/** ¿Redirigir /auth/google al dominio principal? */
export function shouldRedirectGoogleAuthToApex(host: string): boolean {
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  if (!hostname) return false;

  if (hostname.endsWith(".localhost")) {
    return hostname !== "localhost";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return false;
  }

  const apexHost = getApexSiteHost();
  if (hostname === apexHost || hostname === `www.${apexHost}`) {
    return false;
  }

  if (parseStoreSlugFromHost(hostname)) {
    return true;
  }

  return hostname !== apexHost && !hostname.endsWith(`.${apexHost}`);
}
