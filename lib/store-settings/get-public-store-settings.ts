import { getPublicServerClient } from "@/lib/supabase/public-server";
import { withPublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";

async function loadPublicStoreSettingsConfigUncached(
  storeId: string,
): Promise<StoreSettingsConfig> {
  const client = getPublicServerClient();
  const { data, error } = await client
    .from("store_settings")
    .select("config")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer la configuración pública: ${error.message}`);
  }

  const row = data as { config?: unknown } | null;

  if (!row?.config) {
    return defaultStoreSettingsConfig();
  }

  return normalizeStoreSettingsConfig(row.config);
}

export async function getPublicStoreSettingsConfig(
  storeId: string,
): Promise<StoreSettingsConfig> {
  const id = storeId.trim();
  if (!id) return defaultStoreSettingsConfig();

  return withPublicCatalogCache(
    ["public-store-settings-v1", id],
    { storeId: id },
    () => loadPublicStoreSettingsConfigUncached(id),
  );
}
