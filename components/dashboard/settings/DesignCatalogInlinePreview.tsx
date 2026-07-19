"use client";

import { useMemo } from "react";
import type { Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { getReferenceCatalogForStore } from "@/lib/catalog/rubro-preview-products";
import { useReferenceRubroAssets } from "@/lib/catalog/use-reference-rubro-assets";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
import {
  CATALOG_SALE_MODE_PRESETS,
  CATALOG_THEME_PRESETS,
} from "@/lib/store-settings/catalog-theme-presets";
import type { StoreRubro } from "@/src/config/categories";
import { cn } from "@/lib/cn";

interface DesignCatalogInlinePreviewProps {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
  design: CatalogDesignSettings;
  previewRubro: StoreRubro;
}

export function DesignCatalogInlinePreview({
  store,
  exchangeRate,
  exchangeRateUpdatedAt = null,
  baseSettings,
  design,
  previewRubro,
}: DesignCatalogInlinePreviewProps) {
  const { isPrefetching } = useReferenceRubroAssets(previewRubro);

  const resolvedDesign = useMemo(
    () => resolveCatalogDesign(design, previewRubro),
    [design, previewRubro],
  );

  const themeLabel = CATALOG_THEME_PRESETS[resolvedDesign.theme].label;
  const saleLabel = CATALOG_SALE_MODE_PRESETS[resolvedDesign.saleMode].label;

  const referenceCatalog = useMemo(
    () => getReferenceCatalogForStore(store, exchangeRate, previewRubro),
    [store, exchangeRate, previewRubro],
  );

  const settings = useMemo(
    (): CatalogPreviewSettings => ({
      ...baseSettings,
      catalogDesign: resolvedDesign,
    }),
    [baseSettings, resolvedDesign],
  );

  const previewStageKey = [
    resolvedDesign.theme,
    resolvedDesign.saleMode,
    resolvedDesign.visibility.showStock,
    resolvedDesign.visibility.showDescription,
    resolvedDesign.visibility.showPrices,
  ].join("-");

  return (
    <div className="design-studio-preview">
      <div className="design-studio-preview-meta">
        <p className="design-studio-preview-eyebrow">Vista previa en vivo</p>
        <p className="design-studio-preview-caption">
          {themeLabel} · {saleLabel} · {referenceCatalog.rubroLabel}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Catálogo de referencia fijo para comparar temas con la misma
          estética. Tus productos reales no se muestran aquí.
        </p>
      </div>

      <div className="design-studio-preview-frame">
        <span className="design-reference-badge">Diseño de Referencia</span>
        <div
          key={previewRubro}
          className={cn(
            "design-preview-rubro-enter",
            isPrefetching && "design-preview-rubro-swapping",
          )}
        >
          <div key={previewStageKey} className="design-preview-stage">
            <CatalogLivePreview
              store={store}
              products={referenceCatalog.products}
              exchangeRate={exchangeRate}
              exchangeRateUpdatedAt={exchangeRateUpdatedAt}
              settings={settings}
              referenceMode
            />
          </div>
        </div>
      </div>
    </div>
  );
}
