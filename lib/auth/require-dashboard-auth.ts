import type { Store } from "@/lib/database.types";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";
import {
  getAuthUserWithPlan,
  type UserWithPlan,
} from "@/lib/auth/get-user-profile";

export type AuthStoreResult =
  | { ok: true; authUser: UserWithPlan; store: Store }
  | { ok: false; error: string };

export type AuthUserResult =
  | { ok: true; authUser: UserWithPlan }
  | { ok: false; error: string };

/** Usuario autenticado con plan desde `profiles`. */
export async function requireAuthUser(
  client: SupabaseServerClient,
): Promise<AuthUserResult> {
  const authUser = await getAuthUserWithPlan(client);
  if (!authUser) {
    return { ok: false, error: "Debes iniciar sesión." };
  }
  return { ok: true, authUser };
}

/** Usuario autenticado con plan y tienda asociada. */
export async function requireAuthStore(
  client: SupabaseServerClient,
): Promise<AuthStoreResult> {
  const authUser = await getAuthUserWithPlan(client);
  if (!authUser) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const store = await getUserStore(client, authUser.id);
  if (!store) {
    return { ok: false, error: "No tienes una tienda asociada." };
  }

  return { ok: true, authUser, store };
}
