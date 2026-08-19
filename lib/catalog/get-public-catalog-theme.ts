import {
  getCatalogDesignClasses,
  getCatalogRubroClass,
  getCatalogThemeStyle,
  resolveCatalogDesign,
} from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
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

  const config = await getPublicStoreSettingsConfig(store.id);

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
