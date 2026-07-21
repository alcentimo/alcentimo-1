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
  productFormConfig: StoreProductFormConfig;
  previewSettings: CatalogPreviewSettings;
  productLimitContext?: StoreProductLimitContext | null;
}

function resolveStockFilter(value: string | null): CatalogStockFilter {
  return value === "bajo" ? "critical" : "all";
}

export function CatalogPanel({
  store,
  exchangeRate,
  exchangeRateUpdatedAt,
  initialProducts,
  productFormConfig,
  previewSettings,
  productLimitContext = null,
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [autoOpenCreate, setAutoOpenCreate] = useState(
    () => searchParams.get("nuevo") === "1",
  );
  const [stockFilter, setStockFilter] = useState<CatalogStockFilter>(() =>
    resolveStockFilter(searchParams.get("stock")),
  );

  useEffect(() => {
    setStockFilter(resolveStockFilter(searchParams.get("stock")));
  }, [searchParams]);

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

    const params = new URLSearchParams(searchParams.toString());
    if (nextFilter === "critical") {
      params.set("stock", "bajo");
    } else {
      params.delete("stock");
    }

    const query = params.toString();
    router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
      scroll: false,
    });
  }

  return (
    <InventoryPanel
      key={`catalog-${productFormConfig.rubroTienda}`}
      store={store}
      exchangeRate={exchangeRate}
      exchangeRateUpdatedAt={exchangeRateUpdatedAt}
      initialProducts={initialProducts}
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
