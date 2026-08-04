import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import {
  mergeStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import type { CatalogAccessMode } from "@/lib/catalog-access/types";

/** Persiste el modo en store_settings.config y en stores.catalog_access_mode. */
export async function persistCatalogAccessMode(
  storeId: string,
  mode: CatalogAccessMode,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const current = await getStoreSettingsConfig(storeId);
  const merged = mergeStoreSettingsConfig(
    current,
    normalizeStoreSettingsConfig({
      catalogAccess: { mode },
    }),
  );

  const { error: settingsError } = await supabase.from("store_settings").upsert(
    {
      store_id: storeId,
      config: merged,
    },
    { onConflict: "store_id" },
  );

  if (settingsError) return { error: settingsError.message };

  const admin = createAdminClient();
  const { error: storeError } = await admin
    .from("stores")
    .update({ catalog_access_mode: mode })
    .eq("id", storeId);

  if (storeError) return { error: storeError.message };
  return {};
}
