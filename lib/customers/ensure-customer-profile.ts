import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  parseCustomerAccountPath,
  resolveActiveStoreBySlug,
} from "@/lib/customers/middleware-access";

export type EnsureCustomerProfileResult =
  | { ok: true; storeId: string; storeSlug: string }
  | { ok: false; error: string };

/** Extrae el slug de tienda desde rutas /c/{slug}/... o parámetro explícito. */
export function resolveCustomerStoreSlugFromNext(
  nextPath: string | null | undefined,
  fallbackStoreSlug?: string | null,
): string | null {
  const normalizedNext = nextPath?.split("?")[0]?.trim();
  if (normalizedNext) {
    const accountPath = parseCustomerAccountPath(normalizedNext);
    if (accountPath) return accountPath.storeSlug;

    const catalogMatch = normalizedNext.match(/^\/c\/([^/]+)/);
    if (catalogMatch?.[1]) {
      return decodeURIComponent(catalogMatch[1]).trim().toLowerCase();
    }
  }

  const fallback = fallbackStoreSlug?.trim().toLowerCase();
  return fallback && fallback.length > 0 ? fallback : null;
}

function resolveDisplayName(
  explicit: string | null | undefined,
  user: Pick<User, "email" | "user_metadata">,
): string | null {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed.slice(0, 120);

  const metadata = user.user_metadata;
  if (metadata && typeof metadata.display_name === "string") {
    const fromMeta = metadata.display_name.trim();
    if (fromMeta) return fromMeta.slice(0, 120);
  }
  if (metadata && typeof metadata.full_name === "string") {
    const fromFull = metadata.full_name.trim();
    if (fromFull) return fromFull.slice(0, 120);
  }

  const emailLocal = user.email?.split("@")[0]?.trim();
  return emailLocal ? emailLocal.slice(0, 120) : null;
}

function resolvePhone(
  explicit: string | null | undefined,
  user: Pick<User, "user_metadata">,
): string | null {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed.slice(0, 40);

  const metadata = user.user_metadata;
  if (metadata && typeof metadata.phone === "string") {
    const fromMeta = metadata.phone.trim();
    if (fromMeta) return fromMeta.slice(0, 40);
  }

  return null;
}

/** Crea o actualiza customer_profiles para el usuario y la tienda indicada. */
export async function ensureCustomerProfile(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
  storeSlug: string,
  options?: {
    displayName?: string | null;
    phone?: string | null;
  },
): Promise<EnsureCustomerProfileResult> {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const store = await resolveActiveStoreBySlug(supabase, normalizedSlug);

  if (!store) {
    return { ok: false, error: "Tienda no encontrada o no está activa." };
  }

  const payload = {
    user_id: user.id,
    store_id: store.id,
    display_name: resolveDisplayName(options?.displayName, user),
    phone: resolvePhone(options?.phone, user),
  };

  const { error } = await supabase.from("customer_profiles").upsert(payload, {
    onConflict: "user_id,store_id",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, storeId: store.id, storeSlug: store.slug };
}

/** Tras OAuth o confirmación por email: vincula cliente según next o metadata. */
export async function ensureCustomerProfileAfterAuth(
  supabase: SupabaseClient,
  user: User,
  nextPath?: string | null,
  storeSlugParam?: string | null,
): Promise<EnsureCustomerProfileResult | null> {
  const metadataSlug =
    typeof user.user_metadata?.customer_store_slug === "string"
      ? user.user_metadata.customer_store_slug
      : null;

  const storeSlug = resolveCustomerStoreSlugFromNext(
    nextPath,
    storeSlugParam ?? metadataSlug,
  );

  if (!storeSlug) return null;

  return ensureCustomerProfile(supabase, user, storeSlug);
}
