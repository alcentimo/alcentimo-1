import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";

export const getStoreSettingsConfig = cache(
  async (storeId: string): Promise<StoreSettingsConfig> => {
  const client = await createClient();
  const { data, error } = await client
    .from("store_settings")
    .select("config")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data?.config) {
    return defaultStoreSettingsConfig();
  }

  return normalizeStoreSettingsConfig(data.config);
  },
);
