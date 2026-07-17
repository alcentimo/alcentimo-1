import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cliente de lectura para catálogo público en el servidor.
 * Prefiere service role para evitar fallos silenciosos de RLS en producción;
 * cae al anon key si no hay SUPABASE_SERVICE_ROLE_KEY.
 */
export function getPublicServerClient(): SupabaseClient {
  try {
    return createAdminClient();
  } catch {
    return getSupabaseAnonClient();
  }
}
