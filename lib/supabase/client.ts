import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { requireSupabasePublicEnv } from "@/lib/supabase/config";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

let browserClient: SupabaseClient<Database> | undefined;
let browserClientCookieKey: string | undefined;

function browserCookieKey(): string {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "ssr";
  return JSON.stringify(getSupabaseCookieOptions(host) ?? null);
}

/**
 * Cliente browser con cookies compartidas (@supabase/ssr).
 * Singleton por host/opciones de cookie para que el code verifier PKCE
 * y la sesión persistan entre solicitud y callback.
 */
export function createClient(): SupabaseClient<Database> {
  const cookieKey = browserCookieKey();
  if (!browserClient || browserClientCookieKey !== cookieKey) {
    const { url, anonKey } = requireSupabasePublicEnv();
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : undefined;
    browserClient = createBrowserClient<Database>(url, anonKey, {
      cookieOptions: getSupabaseCookieOptions(hostname),
    });
    browserClientCookieKey = cookieKey;
  }

  return browserClient;
}
