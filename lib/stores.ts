import { supabase } from "@/lib/supabase";
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
): Promise<Store | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return null;

  const { data: owned } = await client
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) return owned;

  const { data: membership, error: memberError } = await client
    .from("store_members")
    .select("store_id")
    .eq("user_id", user.id)
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
