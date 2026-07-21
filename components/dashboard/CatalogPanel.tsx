"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { CatalogStockFilter } from "@/lib/inventory/stock-status";
import type { StoreProductLimitContext } from "@/lib/plans/product-limit";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";

interface CatalogPanelProps {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  initialProducts: CatalogListItem[];
  initialTotalCount?: number;
  initialHasMore?: boolean;
  initialCriticalStockCount?: number;
  initialStockFilter?: CatalogStockFilter;
  productFormConfig: StoreProductFormConfig;
  previewSettings: CatalogPreviewSettings;
  productLimitContext?: StoreProductLimitContext | null;
}

function resolveStockFilter(value: string | null): CatalogStockFilter {
  return value === "bajo" ? "critical" : "all";
}

function syncStockFilterUrl(nextFilter: CatalogStockFilter) {
  const params = new URLSearchParams(window.location.search);
  if (nextFilter === "critical") {
    params.set("stock", "bajo");
  } else {
    params.delete("stock");
  }

  const query = params.toString();
  const nextUrl = query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo";
  window.history.replaceState(null, "", nextUrl);
}

export function CatalogPanel({
  store,
  exchangeRate,
  exchangeRateUpdatedAt,
  initialProducts,
  initialTotalCount,
  initialHasMore = false,
  initialCriticalStockCount = 0,
  initialStockFilter = "all",
  productFormConfig,
  previewSettings,
  productLimitContext = null,
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [autoOpenCreate, setAutoOpenCreate] = useState(
    () => searchParams.get("nuevo") === "1",
  );
  const [stockFilter, setStockFilter] = useState<CatalogStockFilter>(
    () => initialStockFilter ?? resolveStockFilter(searchParams.get("stock")),
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
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
  }, [searchParams, router]);

  function handleStockFilterChange(nextFilter: CatalogStockFilter) {
    setStockFilter(nextFilter);
    syncStockFilterUrl(nextFilter);
  }

  return (
    <InventoryPanel
      key={`catalog-${productFormConfig.rubroTienda}`}
      store={store}
      exchangeRate={exchangeRate}
      exchangeRateUpdatedAt={exchangeRateUpdatedAt}
      initialProducts={initialProducts}
      initialTotalCount={initialTotalCount}
      initialHasMore={initialHasMore}
      initialCriticalStockCount={initialCriticalStockCount}
      productFormConfig={productFormConfig}
      previewSettings={previewSettings}
      autoOpenCreate={autoOpenCreate}
      onAutoOpenCreateHandled={() => setAutoOpenCreate(false)}
      stockFilter={stockFilter}
      onStockFilterChange={handleStockFilterChange}
      productLimitContext={productLimitContext}
    />
  );
}
