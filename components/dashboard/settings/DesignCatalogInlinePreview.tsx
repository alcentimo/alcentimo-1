"use client";

import { useMemo } from "react";
import type { Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import {
  getReferenceCatalogForStore,
  useSmartPreviewRubro,
  SMART_PREVIEW_FADE_MS,
} from "@/lib/catalog/smart-preview-engine";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
import {
  CATALOG_THEME_PRESETS,
} from "@/lib/store-settings/catalog-theme-presets";
import { normalizeStoreRubro } from "@/src/config/categories";
import { cn } from "@/lib/cn";

interface DesignCatalogInlinePreviewProps {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
  design: CatalogDesignSettings;
}

export function DesignCatalogInlinePreview({
  store,
  exchangeRate,
  exchangeRateUpdatedAt = null,
  baseSettings,
  design,
}: DesignCatalogInlinePreviewProps) {
  const storeRubro = normalizeStoreRubro(store.rubro_tienda);
  const { isPrefetching } = useSmartPreviewRubro(storeRubro);

  const resolvedDesign = useMemo(
    () => resolveCatalogDesign(design, storeRubro),
    [design, storeRubro],
  );

  const themeLabel = CATALOG_THEME_PRESETS[resolvedDesign.theme].label;

  const referenceCatalog = useMemo(
    () => getReferenceCatalogForStore(store, exchangeRate),
    [store, exchangeRate],
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
    resolvedDesign.primaryColor,
    resolvedDesign.visibility.showStock,
    resolvedDesign.visibility.showDescription,
    resolvedDesign.visibility.showPrices,
  ].join("-");

  return (
    <div className="design-studio-preview">
      <div className="design-studio-preview-meta">
        <p className="design-studio-preview-eyebrow">Vista previa inteligente</p>
        <p className="design-studio-preview-caption">
          {themeLabel} · {referenceCatalog.rubroLabel}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Mockup estático según el rubro configurado en Identidad. Tus productos
          reales no se muestran aquí.
        </p>
      </div>

      <div className="design-studio-preview-frame">
        <span className="design-reference-badge">Diseño de Referencia</span>
        <div
          key={storeRubro}
          className={cn(
            "design-preview-rubro-enter",
            isPrefetching && "design-preview-rubro-swapping",
          )}
          style={{ ["--smart-preview-fade-ms" as string]: `${SMART_PREVIEW_FADE_MS}ms` }}
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
