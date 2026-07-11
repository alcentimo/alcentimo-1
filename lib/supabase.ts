import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente anónimo para lecturas públicas en Server Components (catálogo, etc.).
 * No usar para auth: usar lib/supabase/client (browser) o lib/supabase/server.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
