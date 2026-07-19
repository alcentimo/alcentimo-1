"use client";

import { useMemo } from "react";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
import { isProductOutOfStock } from "@/lib/products/variants";
import { CATALOG_THEME_PRESETS } from "@/lib/store-settings/catalog-theme-presets";

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

  const previewProducts = useMemo(
    () =>
      products
        .filter((product) => !isProductOutOfStock(product))
        .slice(0, 6),
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
      <div className="design-inline-preview-empty">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Vista previa del catálogo
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Publica al menos un producto en tu catálogo para ver la vista previa en
          vivo aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="design-inline-preview">
      <div className="design-inline-preview-header">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Vista previa en vivo
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Tema <span className="font-medium text-zinc-700 dark:text-zinc-300">{themeLabel}</span>
            {" · "}
            color{" "}
            <span
              className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: resolvedDesign.primaryColor }}
                aria-hidden="true"
              />
              {resolvedDesign.primaryColor}
            </span>
          </p>
        </div>
      </div>

      <div className="design-inline-preview-stage">
        <div className="design-inline-preview-viewport">
          <CatalogLivePreview
            store={store}
            products={previewProducts}
            exchangeRate={exchangeRate}
            exchangeRateUpdatedAt={exchangeRateUpdatedAt}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
}
