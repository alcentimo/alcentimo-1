import type { User } from "@supabase/supabase-js";
import type { Store } from "@/lib/database.types";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { DEFAULT_STORE_COUNTRY } from "@/lib/onboarding/countries";
import { DEFAULT_STORE_RUBRO } from "@/src/config/categories";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { scheduleStoreSubdomainProvision } from "@/lib/domains/provision-store-subdomain";
import { syncStoreProductCategories } from "@/lib/products/rubro-categories";
import { getPrimaryCustomerStore } from "@/lib/customers/middleware-access";

const DEFAULT_STORE_NAME = "Mi tienda";

function readMetadataName(user: {
  user_metadata?: User["user_metadata"] | null;
}): string | null {
  const metadata = user.user_metadata ?? {};
  for (const key of ["display_name", "full_name", "name"] as const) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length >= 2) {
      return value.trim();
    }
  }
  return null;
}

/** Nombre temporal de catálogo a partir del nombre o el correo del usuario. */
export function buildDefaultMerchantStoreName(user: {
  email?: string | null;
  user_metadata?: User["user_metadata"] | null;
}): string {
  const fullName = readMetadataName(user);
  if (fullName) {
    const first = fullName.split(/\s+/).find(Boolean) ?? fullName;
    return `Tienda de ${first}`.slice(0, 80);
  }

  const local = user.email?.split("@")[0]?.trim() ?? "";
  if (local.length >= 2) {
    return `Tienda de ${local}`.slice(0, 80);
  }

  return DEFAULT_STORE_NAME;
}

async function resolveUniqueStoreSlug(
  client: SupabaseServerClient,
  baseName: string,
): Promise<string> {
  const fallback = slugify(baseName) || "mi-tienda";

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate =
      attempt === 0 ? fallback : uniqueSlug(baseName, crypto.randomUUID());
    const { data: taken } = await client
      .from("stores")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!taken) return candidate;
  }

  return uniqueSlug(baseName, crypto.randomUUID());
}

/**
 * Crea una tienda genérica si el usuario aún no tiene una.
 * No convierte clientes de catálogo en comercios.
 */
export async function ensureDefaultMerchantStore(
  client: SupabaseServerClient,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: User["user_metadata"] | null;
  },
): Promise<Store | null> {
  const existing = await getUserStore(client, user.id);
  if (existing) return existing;

  const customerStore = await getPrimaryCustomerStore(client, user.id);
  if (customerStore) return null;

  const name = buildDefaultMerchantStoreName(user);

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await resolveUniqueStoreSlug(client, name);
    const { data: store, error: storeError } = await client
      .from("stores")
      .insert({
        owner_id: user.id,
        name,
        slug,
        country: DEFAULT_STORE_COUNTRY,
        rubro_tienda: DEFAULT_STORE_RUBRO,
      })
      .select("*")
      .single();

    if (!storeError && store) {
      scheduleStoreSubdomainProvision({ storeId: store.id, slug });

      const { error: settingsError } = await client.from("store_settings").insert({
        store_id: store.id,
        config: defaultStoreSettingsConfig(),
      });
      if (settingsError && settingsError.code !== "23505") {
        console.error(
          "[ensureDefaultMerchantStore] settings",
          settingsError.message,
        );
      }

      const categorySync = await syncStoreProductCategories(
        client,
        store.id,
        DEFAULT_STORE_RUBRO,
      );
      if (categorySync.error) {
        console.warn("[ensureDefaultMerchantStore] categories", categorySync.error);
      }

      return store;
    }

    if (storeError?.code === "23505") {
      const raced = await getUserStore(client, user.id);
      if (raced) return raced;
      continue;
    }

    console.error(
      "[ensureDefaultMerchantStore] insert",
      storeError?.message ?? "unknown error",
    );
    return getUserStore(client, user.id);
  }

  return getUserStore(client, user.id);
}
