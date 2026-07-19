import { unstable_noStore as noStore } from "next/cache";
import type { Store } from "@/lib/database.types";
import { getCatalogProducts } from "@/lib/catalog";
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

export interface PublicCatalogPageData extends CatalogPageData {
  store: Store;
  storeCategories: CatalogCategoryOption[];
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
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

export async function getPublicCatalogPageData(
  storeSlug: string,
): Promise<PublicCatalogPageData | null> {
  noStore();

  const store = await fetchActiveStoreBySlug(storeSlug);
  if (!store) return null;

  const [catalogData, settingsConfig, storeCategories] = await Promise.all([
    getCatalogProducts({ storeSlug: store.slug, limit: 500 }),
    fetchStoreSettingsConfig(store.id),
    getPublicStoreCategories(store.id),
  ]);

  const purchaseInfo = buildPublicPurchaseInfo(settingsConfig);
  const catalogDesign = resolveCatalogDesign(
    settingsConfig.catalogDesign,
    store.rubro_tienda,
  );

  return {
    store,
    storeCategories,
    ...catalogData,
    purchaseInfo,
    catalogDesign,
    catalogCurrency: settingsConfig.catalogCurrency,
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
