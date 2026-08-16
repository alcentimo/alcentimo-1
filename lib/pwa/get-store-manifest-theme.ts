import type { Store } from "@/lib/database.types";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import {
  getDefaultPrimaryColorForRubro,
  getRubroPalette,
} from "@/lib/store-settings/rubro-palettes";
import { getPublicServerClient } from "@/lib/supabase/public-server";

export interface StoreManifestTheme {
  theme_color: string;
  background_color: string;
}

export async function getStoreManifestTheme(store: Store): Promise<StoreManifestTheme> {
  try {
    const client = getPublicServerClient();
    const { data } = await client
      .from("store_settings")
      .select("config")
      .eq("store_id", store.id)
      .maybeSingle();

    const config = data?.config
      ? normalizeStoreSettingsConfig(data.config)
      : defaultStoreSettingsConfig();

    const design = resolveCatalogDesign(config.catalogDesign, store.rubro_tienda);
    const palette = getRubroPalette(store.rubro_tienda);

    return {
      theme_color: design.primaryColor,
      background_color: palette.pageBg,
    };
  } catch {
    return {
      theme_color: getDefaultPrimaryColorForRubro(null),
      background_color: "#ffffff",
    };
  }
}
