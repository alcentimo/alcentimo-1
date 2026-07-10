import type { SupabaseServerClient } from "@/lib/supabase/server";

/** Garantiza fila en profiles con plan FREE (trigger OAuth / edge cases). */
export async function ensureUserProfile(
  client: SupabaseServerClient,
): Promise<void> {
  const { error } = await client.rpc("ensure_user_profile");

  if (error) {
    throw new Error(error.message);
  }
}
