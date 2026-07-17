import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { requireSupabasePublicEnv } from "@/lib/supabase/config";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Cliente browser con cookies compartidas (@supabase/ssr).
 * Singleton para que el code verifier PKCE persista entre solicitud y callback.
 */
export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, anonKey } = requireSupabasePublicEnv();
    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}
