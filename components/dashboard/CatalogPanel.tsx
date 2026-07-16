"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";

interface CatalogPanelProps {
  store: Store;
  exchangeRate: number | null;
  initialProducts: CatalogListItem[];
  productFormConfig: StoreProductFormConfig;
}

export function CatalogPanel({
  store,
  exchangeRate,
  initialProducts,
  productFormConfig,
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
      store={store}
      exchangeRate={exchangeRate}
      initialProducts={initialProducts}
      productFormConfig={productFormConfig}
      autoOpenCreate={autoOpenCreate}
      onAutoOpenCreateHandled={() => setAutoOpenCreate(false)}
    />
  );
}
