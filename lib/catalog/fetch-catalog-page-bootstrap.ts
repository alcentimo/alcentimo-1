"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { getCurrentExchangeRate } from "@/lib/catalog";
import {
  getCatalogPreviewSettings,
  type CatalogPreviewSettings,
} from "@/lib/catalog/get-public-catalog-page-data";
import {
  getStoreProductFormConfig,
  type StoreProductFormConfig,
} from "@/lib/products/store-field-config";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { getCriticalStockCount } from "@/lib/inventory/get-critical-stock-count";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import { getOnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import { withTimeoutFallback } from "@/lib/async/with-timeout-fallback";
import {
  getRubroLabel,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";
import type { Store } from "@/lib/database.types";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import type { StoreProductLimitContext } from "@/lib/plans/product-limit";

const BOOTSTRAP_TIMEOUT_MS = 10_000;

function fallbackProductFormConfig(rubro: StoreRubro): StoreProductFormConfig {
  return {
    rubroTienda: rubro,
    rubroLabel: getRubroLabel(rubro),
    productCategories: [],
    wholesaleEnabled: false,
    enablePcBuilder: rubro === "tecnologia",
  };
}

function fallbackPreviewSettings(
  rubro: StoreRubro | string | null,
): CatalogPreviewSettings {
  const settings = defaultStoreSettingsConfig();
  return {
    purchaseInfo: buildPublicPurchaseInfo(settings),
    catalogDesign: resolveCatalogDesign(settings.catalogDesign, rubro),
    catalogCurrency: settings.catalogCurrency,
  };
}

export type CatalogPageBootstrap =
  | {
      ok: true;
      store: Store;
      rubroLabel: string;
      exchangeRate: number | null;
      exchangeRateUpdatedAt: string | null;
      productFormConfig: StoreProductFormConfig;
      previewSettings: CatalogPreviewSettings;
      productLimitContext: StoreProductLimitContext | null;
      criticalStockCount: number;
      setupStatus: OnboardingSetupStatus;
    }
  | {
      ok: false;
      code: "unauth" | "no_store" | "error";
      error: string;
    };

/** Bootstrap del catálogo; se invoca solo desde el cliente (useEffect). */
export async function fetchCatalogPageBootstrap(): Promise<CatalogPageBootstrap> {
  try {
    const supabase = await createClient();
    const auth = await requireAuthUser(supabase);
    if (!auth.ok) {
      return { ok: false, code: "unauth", error: auth.error };
    }

    const store = await getUserStore(supabase, auth.authUser.id);
    if (!store) {
      return {
        ok: false,
        code: "no_store",
        error: "No tienes una tienda asociada.",
      };
    }

    const rubro = normalizeStoreRubro(store.rubro_tienda as StoreRubro);
    const rubroLabel = getRubroLabel(rubro);

    const [
      exchangeRateRow,
      productFormConfig,
      previewSettings,
      productLimitContext,
      criticalStockCount,
      storeSettings,
    ] = await Promise.all([
      withTimeoutFallback(
        getCurrentExchangeRate(),
        BOOTSTRAP_TIMEOUT_MS,
        null,
        "catalog-bootstrap:exchange",
      ),
      withTimeoutFallback(
        getStoreProductFormConfig(store.id),
        BOOTSTRAP_TIMEOUT_MS,
        fallbackProductFormConfig(rubro),
        "catalog-bootstrap:form-config",
      ),
      withTimeoutFallback(
        getCatalogPreviewSettings(store),
        BOOTSTRAP_TIMEOUT_MS,
        fallbackPreviewSettings(store.rubro_tienda),
        "catalog-bootstrap:preview",
      ),
      withTimeoutFallback(
        getStoreProductLimitContext(store.id),
        BOOTSTRAP_TIMEOUT_MS,
        null,
        "catalog-bootstrap:limits",
      ),
      withTimeoutFallback(
        getCriticalStockCount(store.slug),
        BOOTSTRAP_TIMEOUT_MS,
        0,
        "catalog-bootstrap:critical",
      ),
      withTimeoutFallback(
        getStoreSettingsConfig(store.id),
        BOOTSTRAP_TIMEOUT_MS,
        defaultStoreSettingsConfig(),
        "catalog-bootstrap:settings",
      ),
    ]);

    return {
      ok: true,
      store,
      rubroLabel,
      exchangeRate: exchangeRateRow?.rate ?? null,
      exchangeRateUpdatedAt: exchangeRateRow?.created_at ?? null,
      productFormConfig,
      previewSettings,
      productLimitContext,
      criticalStockCount,
      setupStatus: getOnboardingSetupStatus(0, storeSettings, store.slug),
    };
  } catch (error) {
    return {
      ok: false,
      code: "error",
      error:
        error instanceof Error
          ? error.message
          : "No se pudo preparar el catálogo.",
    };
  }
}
