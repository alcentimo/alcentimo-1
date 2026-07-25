import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "@/lib/database.types";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import { isStoreOwner } from "@/lib/stores/owner-access";

export interface MerchantStoreContext {
  store: Store;
  role: DashboardStoreRole;
}

/** Tienda activa del comerciante y su rol (dueño o miembro invitado). */
export async function getMerchantStoreContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<MerchantStoreContext | null> {
  const { data: owned, error: ownedError } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedError) throw new Error(ownedError.message);
  if (owned) {
    return { store: owned, role: "owner" };
  }

  const { data: membership, error: memberError } = await supabase
    .from("store_members")
    .select("store_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!membership?.store_id) return null;

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("id", membership.store_id)
    .maybeSingle();

  if (storeError) throw new Error(storeError.message);
  if (!store) return null;

  const role = membership.role === "admin" || membership.role === "staff"
    ? membership.role
    : isStoreOwner(store, userId)
      ? "owner"
      : "staff";

  return { store, role };
}

export async function getMerchantStoreRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardStoreRole | null> {
  const context = await getMerchantStoreContext(supabase, userId);
  return context?.role ?? null;
}
