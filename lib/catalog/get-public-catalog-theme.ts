import {
  getCatalogDesignClasses,
  getCatalogRubroClass,
  getCatalogThemeStyle,
  resolveCatalogDesign,
} from "@/lib/store-settings/catalog-theme";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import { getPublicStoreBySlug } from "@/lib/stores";

export interface PublicCatalogThemeContext {
  catalogDesign: CatalogDesignSettings;
  style: ReturnType<typeof getCatalogThemeStyle>;
  rubroClass: string;
  designClasses: string;
}

export async function getPublicCatalogThemeContext(
  storeSlug: string,
): Promise<PublicCatalogThemeContext | null> {
  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) return null;

  const client = getPublicServerClient();
  const { data } = await client
    .from("store_settings")
    .select("config")
    .eq("store_id", store.id)
    .maybeSingle();

  const config = data?.config
    ? normalizeStoreSettingsConfig(data.config)
    : defaultStoreSettingsConfig();

  const catalogDesign = resolveCatalogDesign(
    config.catalogDesign,
    store.rubro_tienda,
  );

  return {
    catalogDesign,
    style: getCatalogThemeStyle(catalogDesign, store.rubro_tienda),
    rubroClass: getCatalogRubroClass(store.rubro_tienda),
    designClasses: getCatalogDesignClasses(catalogDesign, store.rubro_tienda),
  };
}
