import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { Store } from "@/lib/database.types";
import { getCatalogProducts } from "@/lib/catalog";
import { CATALOG_INITIAL_FETCH } from "@/lib/catalog/catalog-browse";
import { withPublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { getPublicStoreCategories } from "@/lib/catalog/get-public-store-categories";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogPageData } from "@/lib/catalog";
import type { CatalogPreviewSettings } from "@/lib/catalog/catalog-preview-types";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { fetchPublicPlatformSettings } from "@/lib/platform/get-platform-settings";
import { getPublicStoreBySlug } from "@/lib/stores";

import { getPublicStoreLocations, getVariantLocationStocksForStore } from "@/lib/locations/get-store-locations";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import { normalizeStoreRubro } from "@/src/config/categories";

export interface PublicCatalogPageData extends CatalogPageData {
  store: Store;
  storeCategories: CatalogCategoryOption[];
  selectedCategorySlug?: string | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
  locations: StoreLocation[];
  locationStocks: VariantLocationStock[];
}

function normalizeStoreSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export interface GetPublicCatalogPageOptions {
  /** Filtra productos por slug de categoría (página Categorías). */
  categorySlug?: string | null;
  categoryFilter?: boolean;
}

async function loadPublicCatalogPageDataUncached(
  storeSlug: string,
  options?: GetPublicCatalogPageOptions,
): Promise<PublicCatalogPageData | null> {
  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) return null;

  const rubro = normalizeStoreRubro(store.rubro_tienda);

  const [
    settingsConfig,
    platformSettings,
    storeCategories,
    locations,
    locationStocks,
  ] = await Promise.all([
    getPublicStoreSettingsConfig(store.id),
    fetchPublicPlatformSettings(),
    getPublicStoreCategories(store.id),
    getPublicStoreLocations(store.id).catch(() => []),
    getVariantLocationStocksForStore(store.id).catch(() => []),
  ]);

  const visibleStoreCategories = storeCategories;

  let selectedCategorySlug: string | null = null;

  if (options?.categoryFilter) {
    const requested = options.categorySlug?.trim().toLowerCase() ?? "";
    const isAllowed = visibleStoreCategories.some(
      (category) => category.slug === requested,
    );

    if (requested && isAllowed) {
      selectedCategorySlug = requested;
    } else if (visibleStoreCategories[0]) {
      selectedCategorySlug = visibleStoreCategories[0].slug;
    }
  }

  const catalogData = await getCatalogProducts({
    storeSlug: store.slug,
    storeId: store.id,
    limit: CATALOG_INITIAL_FETCH,
    offset: 0,
    categorySlug: selectedCategorySlug ?? undefined,
    ownBrandOnly: settingsConfig.ownBrandStore === true,
  });

  const purchaseInfo = buildPublicPurchaseInfo(
    settingsConfig,
    platformSettings.dropshipShipping,
  );
  const catalogDesign = resolveCatalogDesign(
    settingsConfig.catalogDesign,
    rubro,
  );

  return {
    store,
    storeCategories: visibleStoreCategories,
    selectedCategorySlug,
    ...catalogData,
    purchaseInfo,
    catalogDesign,
    catalogCurrency: settingsConfig.catalogCurrency,
    locations,
    locationStocks,
  };
}

/** Snapshot de la vitrina pública: Data Cache ~60s + invalidación por tag. */
export async function getPublicCatalogPageData(
  storeSlug: string,
  options?: GetPublicCatalogPageOptions,
): Promise<PublicCatalogPageData | null> {
  const slug = normalizeStoreSlug(storeSlug);
  const store = await getPublicStoreBySlug(slug);
  if (!store) return null;

  const categorySlug = options?.categorySlug?.trim().toLowerCase() ?? "";
  const categoryFilter = Boolean(options?.categoryFilter);

  return withPublicCatalogCache(
    ["public-catalog-page-v4", slug, categorySlug, String(categoryFilter)],
    { slug, storeId: store.id },
    () =>
      loadPublicCatalogPageDataUncached(slug, {
        categorySlug: categorySlug || null,
        categoryFilter,
      }),
  );
}

export type { CatalogPreviewSettings } from "@/lib/catalog/catalog-preview-types";

/** Ajustes visuales del catálogo para la vista previa del dashboard. */
export async function getCatalogPreviewSettings(
  store: Store,
): Promise<CatalogPreviewSettings> {
  noStore();

  const [settingsConfig, platformSettings] = await Promise.all([
    getStoreSettingsConfig(store.id),
    fetchPublicPlatformSettings(),
  ]);

  return {
    purchaseInfo: buildPublicPurchaseInfo(
      settingsConfig,
      platformSettings.dropshipShipping,
    ),
    catalogDesign: resolveCatalogDesign(
      settingsConfig.catalogDesign,
      store.rubro_tienda,
    ),
    catalogCurrency: settingsConfig.catalogCurrency,
  };
}
