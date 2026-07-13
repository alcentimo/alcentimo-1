import { supabase } from "@/lib/supabase";
import { getOptionalAuthUser } from "@/lib/auth/optional-auth";
import type { Store } from "@/lib/database.types";
import type { SupabaseServerClient } from "@/lib/supabase/server";

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Tienda del usuario autenticado (dueño o miembro). */
export async function getUserStore(
  client: SupabaseServerClient,
  userId?: string,
): Promise<Store | null> {
  let resolvedUserId = userId;

  if (!resolvedUserId) {
    const user = await getOptionalAuthUser(client);
    if (!user) return null;
    resolvedUserId = user.id;
  }

  const { data: owned } = await client
    .from("stores")
    .select("*")
    .eq("owner_id", resolvedUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) return owned;

  const { data: membership, error: memberError } = await client
    .from("store_members")
    .select("store_id")
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!membership) return null;

  const memberStoreId = membership.store_id as string;

  const { data: store, error: storeError } = await client
    .from("stores")
    .select("*")
    .eq("id", memberStoreId)
    .maybeSingle();

  if (storeError) throw new Error(storeError.message);
  return store;
}

export function getStoreCatalogUrl(slug: string): string {
  return `/tienda/${slug}`;
}

export function getTransactionalCatalogUrl(slug: string): string {
  return `/c/${slug}`;
}

/** Indica si el usuario ya tiene tienda (dueño o miembro). */
export async function userHasStore(
  client: SupabaseServerClient,
  userId: string,
): Promise<boolean> {
  const store = await getUserStore(client, userId);
  return store != null;
}
