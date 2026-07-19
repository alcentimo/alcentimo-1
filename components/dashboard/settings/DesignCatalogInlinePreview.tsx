"use client";

import { useMemo } from "react";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { resolveDesignPreviewProducts } from "@/lib/catalog/rubro-preview-products";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
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

  const preview = useMemo(
    () => resolveDesignPreviewProducts(store, products, exchangeRate),
    [store, products, exchangeRate],
  );

  const settings = useMemo(
    (): CatalogPreviewSettings => ({
      ...baseSettings,
      catalogDesign: resolvedDesign,
    }),
    [baseSettings, resolvedDesign],
  );

  return (
    <div className="design-studio-preview">
      <div className="design-studio-preview-meta">
        <div className="flex flex-wrap items-center gap-2">
          <p className="design-studio-preview-eyebrow">Vista previa en vivo</p>
          {preview.isSampleMode ? (
            <span className="design-studio-preview-badge">Modo muestra</span>
          ) : null}
        </div>
        <p className="design-studio-preview-caption">
          {themeLabel} · {saleLabel}
          {preview.isSampleMode ? ` · ${preview.rubroLabel}` : ""}
        </p>
        {preview.isSampleMode ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Productos de ejemplo para tu rubro. Cuando publiques los tuyos, se
            mostrarán aquí automáticamente.
          </p>
        ) : null}
      </div>

      <div className="design-studio-preview-frame">
        <CatalogLivePreview
          store={store}
          products={preview.products}
          exchangeRate={exchangeRate}
          exchangeRateUpdatedAt={exchangeRateUpdatedAt}
          settings={settings}
        />
      </div>
    </div>
  );
}
