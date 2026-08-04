"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { OnboardingExperience } from "@/components/onboarding/OnboardingExperience";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { InventoryPageSize } from "@/lib/inventory/constants";
import type { CatalogStockFilter } from "@/lib/inventory/stock-status";
import type { StoreProductLimitContext } from "@/lib/plans/product-limit";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import type { InventoryAiSuggestionRow } from "@/lib/inventory-ai/types";
import { InventoryAiSuggestionCards } from "@/components/dashboard/InventoryAiSuggestionCards";
import { requestDashboardShellRefresh } from "@/lib/dashboard/shell-refresh";

interface CatalogPanelProps {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  initialProducts: CatalogListItem[];
  initialTotalCount?: number;
  initialCriticalStockCount?: number;
  initialStockFilter?: CatalogStockFilter;
  initialSearchQuery?: string;
  initialPage?: number;
  initialPageSize?: InventoryPageSize;
  productFormConfig: StoreProductFormConfig;
  previewSettings: CatalogPreviewSettings;
  productLimitContext?: StoreProductLimitContext | null;
  rubroLabel: string;
  setupStatus: OnboardingSetupStatus;
  showWelcomeFromUrl?: boolean;
  /** Si true, el listado se pide en el cliente al montar (página sin await de inventario). */
  loadOnMount?: boolean;
  inventorySuggestions?: InventoryAiSuggestionRow[];
}

export function CatalogPanel({
  store,
  exchangeRate,
  exchangeRateUpdatedAt,
  initialProducts,
  initialTotalCount,
  initialCriticalStockCount = 0,
  initialStockFilter = "all",
  initialSearchQuery = "",
  initialPage = 1,
  initialPageSize = 20,
  productFormConfig,
  previewSettings,
  productLimitContext = null,
  rubroLabel,
  setupStatus,
  showWelcomeFromUrl = false,
  loadOnMount = false,
  inventorySuggestions = [],
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [autoOpenCreate, setAutoOpenCreate] = useState(
    () => searchParams.get("nuevo") === "1",
  );

  const handleSampleProductsCreated = useCallback(() => {
    router.refresh();
    requestDashboardShellRefresh();
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    let changed = false;

    if (params.get("tab") === "ajustes") {
      router.replace("/dashboard/ajustes");
      return;
    }

    if (params.get("tab")) {
      params.delete("tab");
      changed = true;
    }

    if (params.get("nuevo") === "1") {
      params.delete("nuevo");
      changed = true;
    }

    if (changed) {
      const query = params.toString();
      router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
        scroll: false,
      });
    }
  }, [searchParamsKey, router]);

  const trial = productLimitContext?.trial ?? null;
  const trialActive = trial?.active ?? false;

  return (
    <>
      <Suspense fallback={null}>
        <OnboardingExperience
          storeId={store.id}
          showWelcomeFromUrl={showWelcomeFromUrl}
          trialActive={trialActive}
        />
      </Suspense>

      <InventoryAiSuggestionCards
        initialSuggestions={inventorySuggestions}
        variant="compact"
      />

      <InventoryPanel
        key={`catalog-${productFormConfig.rubroTienda}`}
        store={store}
        exchangeRate={exchangeRate}
        exchangeRateUpdatedAt={exchangeRateUpdatedAt}
        initialProducts={initialProducts}
        initialTotalCount={initialTotalCount}
        initialCriticalStockCount={initialCriticalStockCount}
        productFormConfig={productFormConfig}
        previewSettings={previewSettings}
        autoOpenCreate={autoOpenCreate}
        onAutoOpenCreateHandled={() => setAutoOpenCreate(false)}
        initialStockFilter={initialStockFilter}
        initialSearchQuery={initialSearchQuery}
        initialPage={initialPage}
        initialPageSize={initialPageSize}
        productLimitContext={productLimitContext}
        rubroLabel={rubroLabel}
        onSampleProductsCreated={handleSampleProductsCreated}
        setupStatus={setupStatus}
        loadOnMount={loadOnMount}
      />
    </>
  );
}
