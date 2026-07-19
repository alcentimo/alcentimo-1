import type { CSSProperties } from "react";
import {
  DEFAULT_STORE_RUBRO,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";
import {
  CATALOG_THEME_PRESETS,
} from "@/lib/store-settings/catalog-theme-presets";
import type {
  CatalogDesignSettings,
  CatalogLayoutMode,
  CatalogSaleMode,
  CatalogThemeId,
  CatalogVisibilitySettings,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

const RUBRO_THEME_COLORS: Record<StoreRubro, string> = {
  ferreteria: "#ea580c",
  "ropa-moda": "#db2777",
  calzado: "#7c3aed",
  tecnologia: "#2563eb",
  alimentos: "#16a34a",
  "salud-belleza": "#0891b2",
  "hogar-decoracion": "#b45309",
  general: "#0d9488",
};

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function getDefaultPrimaryColorForRubro(
  rubro: string | null | undefined,
): string {
  const normalized = normalizeStoreRubro(rubro);
  return RUBRO_THEME_COLORS[normalized] ?? RUBRO_THEME_COLORS[DEFAULT_STORE_RUBRO];
}

export function normalizeCatalogPrimaryColor(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return getDefaultPrimaryColorForRubro(DEFAULT_STORE_RUBRO);
}

export function normalizeCatalogLayout(value: unknown): CatalogLayoutMode {
  return value === "list" ? "list" : "grid";
}

export function normalizeCatalogTheme(value: unknown): CatalogThemeId | null {
  if (value === "minimal" || value === "impact" || value === "classic") {
    return value;
  }
  return null;
}

export function normalizeCatalogSaleMode(value: unknown): CatalogSaleMode {
  return value === "showcase" ? "showcase" : "quick";
}

export function normalizeCatalogVisibility(
  value: unknown,
  fallback?: CatalogVisibilitySettings,
): CatalogVisibilitySettings {
  const base = fallback ?? {
    showStock: true,
    showDescription: true,
    showPrices: true,
  };

  if (typeof value !== "object" || value === null) {
    return base;
  }

  const raw = value as Record<string, unknown>;

  return {
    showStock:
      typeof raw.showStock === "boolean" ? raw.showStock : base.showStock,
    showDescription:
      typeof raw.showDescription === "boolean"
        ? raw.showDescription
        : base.showDescription,
    showPrices:
      typeof raw.showPrices === "boolean" ? raw.showPrices : base.showPrices,
  };
}

function inferThemeFromLegacy(
  design: Partial<CatalogDesignSettings> | undefined,
): CatalogThemeId {
  if (design?.layout === "list") {
    return "classic";
  }
  return "minimal";
}

export function resolveCatalogDesign(
  design: Partial<CatalogDesignSettings> | undefined,
  storeRubro: string | null | undefined,
): Required<Pick<CatalogDesignSettings, "primaryColor" | "layout">> &
  CatalogDesignSettings {
  const theme =
    normalizeCatalogTheme(design?.theme) ?? inferThemeFromLegacy(design);
  const preset = CATALOG_THEME_PRESETS[theme];
  const saleMode = normalizeCatalogSaleMode(design?.saleMode);
  const visibility = normalizeCatalogVisibility(design?.visibility);

  const fallbackColor = getDefaultPrimaryColorForRubro(storeRubro);
  const legacyColor =
    design?.primaryColor && HEX_COLOR_PATTERN.test(design.primaryColor)
      ? design.primaryColor.toLowerCase()
      : null;

  const primaryColor =
    design?.theme != null
      ? preset.primaryColor
      : (legacyColor ?? preset.primaryColor ?? fallbackColor);

  const layout =
    design?.theme != null
      ? preset.layout
      : normalizeCatalogLayout(design?.layout ?? preset.layout);

  return {
    theme,
    saleMode,
    visibility,
    primaryColor,
    layout,
  };
}

export function getCatalogThemeStyle(design: CatalogDesignSettings): CSSProperties {
  const resolved = resolveCatalogDesign(design, undefined);
  const preset = CATALOG_THEME_PRESETS[resolved.theme];

  return {
    ["--txn-primary" as string]: resolved.primaryColor,
    ["--txn-primary-hover" as string]: resolved.primaryColor,
    ...preset.cssVars,
  } as CSSProperties;
}

export function getCatalogDesignClasses(
  design: CatalogDesignSettings,
): string {
  const resolved = resolveCatalogDesign(design, undefined);

  return cn(
    `txn-catalog--theme-${resolved.theme}`,
    `txn-catalog--sale-${resolved.saleMode}`,
    resolved.layout === "list" && "txn-catalog--list",
    !resolved.visibility.showDescription && "txn-catalog--hide-desc",
    !resolved.visibility.showPrices && "txn-catalog--hide-prices",
    !resolved.visibility.showStock && "txn-catalog--hide-stock",
  );
}

export function getProductBodyLayoutClass(
  visibility: CatalogVisibilitySettings,
): string {
  const { showDescription, showPrices } = visibility;

  if (!showDescription && !showPrices) {
    return "store-product-body--no-desc-prices";
  }
  if (!showDescription) {
    return "store-product-body--no-desc";
  }
  if (!showPrices) {
    return "store-product-body--no-prices";
  }
  return "";
}
