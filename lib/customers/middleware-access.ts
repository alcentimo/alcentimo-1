import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStoreCatalogPublicUrl,
  getStoreCustomerAccountPath,
  isStoreSubdomainCatalogEnabled,
  parseStoreSlugFromHost,
} from "@/lib/store-host";

export interface CustomerStoreContext {
  storeId: string;
  storeSlug: string;
}

/** Ruta /c/{slug}/cuenta|perfil o /cuenta|perfil en subdominio de tienda. */
export function parseCustomerAccountPath(
  pathname: string,
  storeSlugFromHost?: string | null,
): { storeSlug: string } | null {
  if (storeSlugFromHost) {
    if (/^\/cuenta(?:\/|$)/.test(pathname) || /^\/perfil(?:\/|$)/.test(pathname)) {
      return { storeSlug: storeSlugFromHost.trim().toLowerCase() };
    }
  }

  const match = pathname.match(/^\/c\/([^/]+)\/(?:cuenta|perfil)(?:\/|$)/);
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
  return getStoreCustomerAccountPath(storeSlug, "cuenta");
}

export function buildCustomerRegisterPath(
  storeSlug: string,
  nextPath?: string,
): string {
  const params = new URLSearchParams({ store: storeSlug });
  if (nextPath) params.set("next", nextPath);
  return `/register?${params.toString()}`;
}

/** Destino post-registro: URL absoluta en subdominio o ruta relativa legacy. */
export function resolveCustomerNextDestination(
  storeSlug: string,
  nextPath?: string | null,
): string {
  const slug = storeSlug.trim().toLowerCase();
  const fallback = isStoreSubdomainCatalogEnabled()
    ? getStoreCatalogPublicUrl(slug, "cuenta")
    : getStoreCustomerAccountPath(slug, "cuenta");

  if (!nextPath?.trim()) return fallback;

  const trimmed = nextPath.trim();
  const query = trimmed.includes("?") ? trimmed.slice(trimmed.indexOf("?")) : "";
  const pathOnly = trimmed.split("?")[0]?.trim() ?? "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (parseStoreSlugFromHost(url.host) === slug) {
        return trimmed;
      }
    } catch {
      return fallback;
    }
    return fallback;
  }

  if (isStoreSubdomainCatalogEnabled()) {
    if (trimmed.startsWith(`/c/${slug}`)) {
      const suffix = trimmed.slice(`/c/${slug}`.length) || "/";
      return `${getStoreCatalogPublicUrl(slug, suffix.split("?")[0])}${query}`;
    }

    if (pathOnly.startsWith("/")) {
      return `${getStoreCatalogPublicUrl(slug, pathOnly)}${query}`;
    }

    return fallback;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  return fallback;
}
