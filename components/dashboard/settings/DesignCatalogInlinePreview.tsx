"use client";

import { useMemo } from "react";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
import { isProductOutOfStock } from "@/lib/products/variants";
import {
  CATALOG_SALE_MODE_PRESETS,
  CATALOG_THEME_PRESETS,
} from "@/lib/store-settings/catalog-theme-presets";

interface DesignCatalogInlinePreviewProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
  design: CatalogDesignSettings;
}

export function DesignCatalogInlinePreview({
  store,
  products,
  exchangeRate,
  exchangeRateUpdatedAt = null,
  baseSettings,
  design,
}: DesignCatalogInlinePreviewProps) {
  const resolvedDesign = useMemo(
    () => resolveCatalogDesign(design, store.rubro_tienda),
    [design, store.rubro_tienda],
  );

  const themeLabel = CATALOG_THEME_PRESETS[resolvedDesign.theme].label;
  const saleLabel = CATALOG_SALE_MODE_PRESETS[resolvedDesign.saleMode].label;

  const previewProducts = useMemo(
    () =>
      products
        .filter((product) => !isProductOutOfStock(product))
        .slice(0, 8),
    [products],
  );

  const settings = useMemo(
    (): CatalogPreviewSettings => ({
      ...baseSettings,
      catalogDesign: resolvedDesign,
    }),
    [baseSettings, resolvedDesign],
  );

  if (previewProducts.length === 0) {
    return (
      <div className="design-studio-preview-empty">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Aún no hay productos para previsualizar
        </p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
          Publica al menos un producto en tu catálogo para ver cómo se verá tu
          tienda aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="design-studio-preview">
      <div className="design-studio-preview-meta">
        <p className="design-studio-preview-eyebrow">Vista previa en vivo</p>
        <p className="design-studio-preview-caption">
          {themeLabel} · {saleLabel}
        </p>
      </div>

      <div className="design-studio-preview-frame">
        <CatalogLivePreview
          store={store}
          products={previewProducts}
          exchangeRate={exchangeRate}
          exchangeRateUpdatedAt={exchangeRateUpdatedAt}
          settings={settings}
        />
      </div>
    </div>
  );
}
