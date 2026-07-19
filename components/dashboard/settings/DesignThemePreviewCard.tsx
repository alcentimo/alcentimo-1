"use client";

import type { CSSProperties } from "react";
import { Plus } from "lucide-react";
import {
  CATALOG_THEME_PRESETS,
} from "@/lib/store-settings/catalog-theme-presets";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import type { CatalogSaleMode, CatalogThemeId } from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface DesignThemePreviewCardProps {
  themeId: CatalogThemeId;
  primaryColor: string;
  saleMode?: CatalogSaleMode;
}

function MiniProductCard({
  primaryColor,
  variant,
}: {
  primaryColor: string;
  variant: "a" | "b";
}) {
  return (
    <article className="store-product-card group h-full">
      <div className="store-product-media">
        <div
          className="store-product-media-fallback"
          aria-hidden="true"
          style={{
            background: `linear-gradient(145deg, ${primaryColor}28, ${primaryColor}10)`,
          }}
        >
          <span
            className="store-product-media-fallback-label"
            style={{ color: `${primaryColor}99` }}
          >
            {variant === "a" ? "P" : "T"}
          </span>
        </div>
      </div>
      <div className="store-product-content">
        <div className="store-product-body store-product-body--no-desc">
          <div className="store-product-slot store-product-slot-meta">
            <p className="store-product-category">Categoría</p>
          </div>
          <div className="store-product-slot store-product-slot-title">
            <h2 className="store-product-name">
              {variant === "a" ? "Producto demo" : "Otro artículo"}
            </h2>
          </div>
          <div className="store-product-slot store-product-slot-variant">
            <span className="store-product-variant-placeholder" aria-hidden="true" />
          </div>
          <div className="store-product-slot store-product-slot-pricing">
            <div className="store-product-price-row">
              <p className="store-product-price-usd">
                {variant === "a" ? "$12.00" : "$24.50"}
              </p>
            </div>
          </div>
        </div>
        <div className="store-product-footer sm:hidden">
          <button
            type="button"
            tabIndex={-1}
            className="store-add-btn-mobile w-full"
            style={
              {
                borderColor: primaryColor,
                color: primaryColor,
                backgroundColor: "white",
              } as CSSProperties
            }
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

export function DesignThemePreviewCard({
  themeId,
  primaryColor,
  saleMode = "quick",
}: DesignThemePreviewCardProps) {
  const preset = CATALOG_THEME_PRESETS[themeId];
  const accent = primaryColor || preset.primaryColor;
  const isList = preset.layout === "list";

  const previewDesign = {
    theme: themeId,
    saleMode,
    visibility: {
      showStock: false,
      showDescription: false,
      showPrices: true,
    },
    primaryColor: accent,
    layout: preset.layout,
  };

  return (
    <div
      className={cn(
        "design-theme-preview-canvas txn-catalog txn-catalog--preview",
        getCatalogDesignClasses(previewDesign),
      )}
      style={getCatalogThemeStyle(previewDesign)}
      aria-hidden="true"
    >
      <div className={isList ? "txn-product-list" : "txn-product-grid"}>
        <MiniProductCard primaryColor={accent} variant="a" />
        {!isList ? <MiniProductCard primaryColor={accent} variant="b" /> : null}
      </div>
    </div>
  );
}
