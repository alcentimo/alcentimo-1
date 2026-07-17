import type { SupabaseClient } from "@supabase/supabase-js";

export interface CustomerStoreContext {
  storeId: string;
  storeSlug: string;
}

/** Ruta /c/{slug}/cuenta o subrutas. */
export function parseCustomerAccountPath(pathname: string): { storeSlug: string } | null {
  const match = pathname.match(/^\/c\/([^/]+)\/cuenta(?:\/|$)/);
  if (!match?.[1]) return null;

  return {
    storeSlug: decodeURIComponent(match[1]).trim().toLowerCase(),
  };
}

export async function userHasMerchantStore(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: owned } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (owned) return true;

  const { data: membership } = await supabase
    .from("store_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return Boolean(membership);
}

export async function userIsMerchantOfStoreSlug(
  supabase: SupabaseClient,
  userId: string,
  storeSlug: string,
): Promise<boolean> {
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", storeSlug)
    .maybeSingle();

  if (!store?.id) return false;

  const { data: owned } = await supabase
    .from("stores")
    .select("id")
    .eq("id", store.id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (owned) return true;

  const { data: membership } = await supabase
    .from("store_members")
    .select("id")
    .eq("store_id", store.id)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(membership);
}

export async function resolveActiveStoreBySlug(
  supabase: SupabaseClient,
  storeSlug: string,
): Promise<{ id: string; slug: string } | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.id) return null;
  return { id: data.id, slug: data.slug };
}

export async function userIsCustomerOfStoreId(
  supabase: SupabaseClient,
  userId: string,
  storeId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

/** Primera tienda-cliente del usuario (para redirecciones genéricas). */
export async function getPrimaryCustomerStore(
  supabase: SupabaseClient,
  userId: string,
): Promise<CustomerStoreContext | null> {
  const { data: profile, error: profileError } = await supabase
    .from("customer_profiles")
    .select("store_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (profileError || !profile?.store_id) return null;

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("id", profile.store_id)
    .eq("is_active", true)
    .maybeSingle();

  if (storeError || !store?.slug) return null;

  return {
    storeId: store.id,
    storeSlug: store.slug,
  };
}

export function buildCustomerAccountPath(storeSlug: string): string {
  return `/c/${storeSlug}/cuenta`;
}

export function buildCustomerRegisterPath(
  storeSlug: string,
  nextPath?: string,
): string {
  const params = new URLSearchParams({ store: storeSlug });
  if (nextPath) params.set("next", nextPath);
  return `/register?${params.toString()}`;
}
