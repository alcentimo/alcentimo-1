"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { AvailableProductsPanel } from "@/components/dashboard/AvailableProductsPanel";
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
import { cn } from "@/lib/cn";

type CatalogView = "disponibles" | "tienda";

function resolveCatalogView(
  raw: string | null,
  hasProducts: boolean,
): CatalogView {
  if (raw === "tienda" || raw === "mi-tienda") return "tienda";
  if (raw === "disponibles" || raw === "mayorista") return "disponibles";
  // Por defecto: productos disponibles (flujo dropshipping).
  // Si ya tienen catálogo, también priorizamos disponibles salvo ?vista=tienda.
  void hasProducts;
  return "disponibles";
}

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
  setupStatus,
  showWelcomeFromUrl = false,
  loadOnMount = false,
  inventorySuggestions = [],
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const storeProductCount =
    productLimitContext?.currentCount ?? initialTotalCount ?? initialProducts.length;

  const [view, setView] = useState<CatalogView>(() =>
    resolveCatalogView(searchParams.get("vista"), storeProductCount > 0),
  );
  const [autoOpenCreate, setAutoOpenCreate] = useState(
    () => searchParams.get("nuevo") === "1",
  );
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

  useEffect(() => {
    // Mantiene el badge de Órdenes al día al abrir el catálogo.
    requestDashboardShellRefresh();
  }, []);

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
      setView("tienda");
      setAutoOpenCreate(true);
      params.delete("nuevo");
      changed = true;
    }

    const vista = params.get("vista");
    if (vista === "tienda" || vista === "mi-tienda") {
      setView("tienda");
    } else if (vista === "disponibles" || vista === "mayorista") {
      setView("disponibles");
    }

    if (changed) {
      const query = params.toString();
      router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
        scroll: false,
      });
    }
  }, [searchParamsKey, router]);

  function openView(next: CatalogView) {
    setView(next);
    const params = new URLSearchParams(searchParamsKey);
    params.delete("nuevo");
    params.delete("tab");
    if (next === "disponibles") {
      params.set("vista", "disponibles");
    } else {
      params.set("vista", "tienda");
    }
    const query = params.toString();
    router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
      scroll: false,
    });
  }

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

      <div
        className="customers-segment-tabs mb-6"
        role="tablist"
        aria-label="Vistas del catálogo"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "disponibles"}
          className={cn(
            "customers-segment-tab",
            view === "disponibles" && "customers-segment-tab-active",
          )}
          onClick={() => openView("disponibles")}
        >
          Productos disponibles
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "tienda"}
          className={cn(
            "customers-segment-tab",
            view === "tienda" && "customers-segment-tab-active",
          )}
          onClick={() => openView("tienda")}
        >
          Mi tienda
          {storeProductCount > 0 ? (
            <span className="customers-segment-count">{storeProductCount}</span>
          ) : null}
        </button>
      </div>

      {view === "disponibles" ? (
        <AvailableProductsPanel
          onImported={() => {
            setInventoryRefreshKey((key) => key + 1);
            router.refresh();
          }}
        />
      ) : (
        <InventoryPanel
          key={`catalog-${productFormConfig.rubroTienda}-${inventoryRefreshKey}`}
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
          setupStatus={setupStatus}
          loadOnMount={loadOnMount || inventoryRefreshKey > 0}
          emptyBrowseHref="/dashboard/catalogo?vista=disponibles"
          emptyBrowseLabel="Ver productos disponibles"
        />
      )}
    </>
  );
}
