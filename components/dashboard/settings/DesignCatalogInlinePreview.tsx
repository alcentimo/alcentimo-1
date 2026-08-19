"use client";

import { useMemo } from "react";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import {
  getReferenceCatalogForStore,
  useSmartPreviewRubro,
  SMART_PREVIEW_FADE_MS,
} from "@/lib/catalog/smart-preview-engine";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings } from "@/lib/store-settings/types";
import { normalizeStoreRubro } from "@/src/config/categories";
import { cn } from "@/lib/cn";

interface DesignCatalogInlinePreviewProps {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
  design: CatalogDesignSettings;
  /** Productos reales de la tienda (misma fuente que el catálogo público). */
  storeProducts?: CatalogListItem[];
  /** Compact chrome for the fullscreen design editor. */
  variant?: "inline" | "immersive";
}

export function DesignCatalogInlinePreview({
  store,
  exchangeRate,
  exchangeRateUpdatedAt = null,
  baseSettings,
  design,
  storeProducts = [],
  variant = "inline",
}: DesignCatalogInlinePreviewProps) {
  const storeRubro = normalizeStoreRubro(store.rubro_tienda);
  const { isPrefetching } = useSmartPreviewRubro(storeRubro);

  const resolvedDesign = useMemo(
    () => resolveCatalogDesign(design, storeRubro),
    [design, storeRubro],
  );

  const referenceCatalog = useMemo(
    () => getReferenceCatalogForStore(store, exchangeRate),
    [store, exchangeRate],
  );

  const usingRealProducts = storeProducts.length > 0;
  const previewProducts = usingRealProducts
    ? storeProducts
    : referenceCatalog.products;

  const settings = useMemo((): CatalogPreviewSettings => {
    return {
      ...baseSettings,
      catalogDesign: resolvedDesign,
    };
  }, [baseSettings, resolvedDesign]);

  const previewStageKey = [
    "moriche",
    resolvedDesign.primaryColor,
    resolvedDesign.promoBanner?.enabled,
    resolvedDesign.promoBanner?.slides.length,
    resolvedDesign.header?.coverImageUrl,
    store.logo_url,
    usingRealProducts ? "live-products" : "reference",
    previewProducts.length,
  ].join("-");

  const immersive = variant === "immersive";

  return (
    <div
      className={cn(
        "design-studio-preview",
        immersive && "design-studio-preview--immersive",
      )}
    >
      <div className="design-studio-preview-meta">
        <p className="design-studio-preview-eyebrow">Vista previa</p>
        <p className="design-studio-preview-caption">
          Misma vitrina marketplace que tu tienda pública
          {usingRealProducts
            ? ` · ${previewProducts.length} producto${previewProducts.length === 1 ? "" : "s"}`
            : ` · demo ${referenceCatalog.rubroLabel}`}
        </p>
        {!immersive ? (
          <p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">
            {usingRealProducts
              ? "Renderiza el mismo componente TransactionalCatalog que /c/[slug]."
              : "Sin productos aún: se muestra una demo del rubro. Al publicar productos, verás los reales."}
          </p>
        ) : null}
      </div>

      <div className="design-studio-preview-frame design-studio-preview-frame--moriche">
        <div
          className="design-studio-phone design-studio-phone--moriche"
          aria-label="Vista previa del catálogo"
        >
          <div className="design-studio-phone-bezel">
            <div
              key={storeRubro}
              className={cn(
                "design-preview-rubro-enter",
                isPrefetching && "design-preview-rubro-swapping",
              )}
              style={{
                ["--smart-preview-fade-ms" as string]: `${SMART_PREVIEW_FADE_MS}ms`,
              }}
            >
              <div key={previewStageKey} className="design-preview-stage">
                <CatalogLivePreview
                  store={store}
                  products={previewProducts}
                  exchangeRate={exchangeRate}
                  exchangeRateUpdatedAt={exchangeRateUpdatedAt}
                  settings={settings}
                  referenceMode={!usingRealProducts}
                  showReferenceCta={!usingRealProducts}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
