import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { requireSupabasePublicEnv } from "@/lib/supabase/config";

let anonClient: SupabaseClient<Database> | undefined;

/**
 * Cliente anónimo para lecturas públicas en el servidor (catálogo, cupones, etc.).
 * Inicialización lazy: no accede a process.env al importar el módulo.
 */
export function getSupabaseAnonClient(): SupabaseClient<Database> {
  if (!anonClient) {
    const { url, anonKey } = requireSupabasePublicEnv();
    anonClient = createClient<Database>(url, anonKey);
  }

  return anonClient;
}
