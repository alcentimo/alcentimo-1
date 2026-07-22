"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { InventoryPageSize } from "@/lib/inventory/constants";
import type { CatalogStockFilter } from "@/lib/inventory/stock-status";
import type { StoreProductLimitContext } from "@/lib/plans/product-limit";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";

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
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [autoOpenCreate, setAutoOpenCreate] = useState(
    () => searchParams.get("nuevo") === "1",
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

  return (
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
    />
  );
}
