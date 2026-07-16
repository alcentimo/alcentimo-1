import { unstable_noStore as noStore } from "next/cache";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";

export async function getPublicStoreSettingsConfig(
  storeId: string,
): Promise<StoreSettingsConfig> {
  noStore();

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
