import type { CookieOptions } from "@supabase/ssr";
import { getApexSiteHost } from "@/lib/site-url";
import { isStoreSubdomainCatalogEnabled } from "@/lib/store-host";

/** Opciones de cookie compartidas entre subdominios (*.alcentimo.com). */
export function getSupabaseCookieOptions(): CookieOptions | undefined {
  if (!isStoreSubdomainCatalogEnabled()) {
    return undefined;
  }

  const apexHost = getApexSiteHost();
  if (!apexHost || apexHost.includes("localhost")) {
    return undefined;
  }

  return {
    domain: `.${apexHost}`,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
