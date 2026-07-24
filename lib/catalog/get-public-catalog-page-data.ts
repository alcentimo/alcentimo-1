import { unstable_noStore as noStore } from "next/cache";
import type { Store } from "@/lib/database.types";
import { getCatalogProducts } from "@/lib/catalog";
import { CATALOG_INITIAL_FETCH } from "@/lib/catalog/catalog-browse";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { getPublicStoreCategories } from "@/lib/catalog/get-public-store-categories";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogPageData } from "@/lib/catalog";
import { getPublicServerClient } from "@/lib/supabase/public-server";

import { getPublicStoreLocations, getVariantLocationStocksForStore } from "@/lib/locations/get-store-locations";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";

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

async function fetchActiveStoreBySlug(slug: string): Promise<Store | null> {
  const normalizedSlug = normalizeStoreSlug(slug);
  const client = getPublicServerClient();

  const { data, error } = await client
    .from("stores")
    .select("*")
    .eq("slug", normalizedSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo cargar la tienda pública: ${error.message}`);
  }

  return data;
}

async function fetchStoreSettingsConfig(storeId: string) {
  const client = getPublicServerClient();

  const { data, error } = await client
    .from("store_settings")
    .select("config")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo cargar la configuración pública: ${error.message}`);
  }

  if (!data?.config) {
    return defaultStoreSettingsConfig();
  }

  return normalizeStoreSettingsConfig(data.config);
}

export interface GetPublicCatalogPageOptions {
  /** Filtra productos por slug de categoría (página Categorías). */
  categorySlug?: string | null;
  categoryFilter?: boolean;
}

export async function getPublicCatalogPageData(
  storeSlug: string,
  options?: GetPublicCatalogPageOptions,
): Promise<PublicCatalogPageData | null> {
  noStore();

  const store = await fetchActiveStoreBySlug(storeSlug);
  if (!store) return null;

  const [settingsConfig, storeCategories, locations, locationStocks] = await Promise.all([
    fetchStoreSettingsConfig(store.id),
    getPublicStoreCategories(store.id),
    getPublicStoreLocations(store.id).catch(() => []),
    getVariantLocationStocksForStore(store.id).catch(() => []),
  ]);

  let selectedCategorySlug: string | null = null;

  if (options?.categoryFilter) {
    const requested = options.categorySlug?.trim().toLowerCase() ?? "";
    const isAllowed = storeCategories.some(
      (category) => category.slug === requested,
    );

    if (requested && isAllowed) {
      selectedCategorySlug = requested;
    } else if (storeCategories[0]) {
      selectedCategorySlug = storeCategories[0].slug;
    }
  }

  const catalogData = await getCatalogProducts({
    storeSlug: store.slug,
    limit: CATALOG_INITIAL_FETCH,
    offset: 0,
    categorySlug: selectedCategorySlug ?? undefined,
  });

  const purchaseInfo = buildPublicPurchaseInfo(settingsConfig);
  const catalogDesign = resolveCatalogDesign(
    settingsConfig.catalogDesign,
    store.rubro_tienda,
  );

  return {
    store,
    storeCategories,
    selectedCategorySlug,
    ...catalogData,
    purchaseInfo,
    catalogDesign,
    catalogCurrency: settingsConfig.catalogCurrency,
    locations,
    locationStocks,
  };
}

export interface CatalogPreviewSettings {
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
}

/** Ajustes visuales del catálogo para la vista previa del dashboard. */
export async function getCatalogPreviewSettings(
  store: Store,
): Promise<CatalogPreviewSettings> {
  noStore();

  const settingsConfig = await fetchStoreSettingsConfig(store.id);

  return {
    purchaseInfo: buildPublicPurchaseInfo(settingsConfig),
    catalogDesign: resolveCatalogDesign(
      settingsConfig.catalogDesign,
      store.rubro_tienda,
    ),
    catalogCurrency: settingsConfig.catalogCurrency,
  };
}
