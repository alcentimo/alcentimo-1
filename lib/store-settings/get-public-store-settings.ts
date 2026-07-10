import { supabase } from "@/lib/supabase";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";

export async function getPublicStoreSettingsConfig(
  storeId: string,
): Promise<StoreSettingsConfig> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("config")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as { config?: unknown } | null;

  if (!row?.config) {
    return defaultStoreSettingsConfig();
  }

  return normalizeStoreSettingsConfig(row.config);
}
