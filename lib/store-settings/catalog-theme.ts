import type { CSSProperties } from "react";
import {
  DEFAULT_STORE_RUBRO,
  normalizeStoreRubro,
} from "@/src/config/categories";
import {
  CATALOG_THEME_PRESETS,
  FASHION_CATALOG_THEME_IDS,
  isFashionCatalogThemeId,
} from "@/lib/store-settings/catalog-theme-presets";
import {
  buildCatalogAccentCssVars,
  getDefaultPrimaryColorForRubro,
  getRubroPalette,
} from "@/lib/store-settings/rubro-palettes";
import { normalizeHex6 } from "@/lib/store-settings/color-contrast";
import type {
  CatalogDesignSettings,
  CatalogLayoutMode,
  CatalogSaleMode,
  CatalogThemeId,
  CatalogVisibilitySettings,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

export { getDefaultPrimaryColorForRubro } from "@/lib/store-settings/rubro-palettes";

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

const LEGACY_TO_FASHION: Record<"minimal" | "impact" | "classic", CatalogThemeId> = {
  minimal: "fashion-pure",
  impact: "fashion-nocturne",
  classic: "fashion-editorial",
};

const FASHION_TO_LEGACY: Record<
  "fashion-pure" | "fashion-nocturne" | "fashion-editorial",
  CatalogThemeId
> = {
  "fashion-pure": "minimal",
  "fashion-nocturne": "impact",
  "fashion-editorial": "classic",
};

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
  if (
    value === "minimal" ||
    value === "impact" ||
    value === "classic" ||
    value === "fashion-pure" ||
    value === "fashion-nocturne" ||
    value === "fashion-editorial"
  ) {
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

function usesFashionThemePalette(
  storeRubro: string | null | undefined,
  theme: CatalogThemeId,
): boolean {
  return (
    normalizeStoreRubro(storeRubro) === "ropa-moda" &&
    isFashionCatalogThemeId(theme)
  );
}

/** Ajusta el tema al conjunto permitido por el rubro de la tienda. */
export function coerceThemeForRubro(
  theme: CatalogThemeId,
  storeRubro: string | null | undefined,
): CatalogThemeId {
  const rubro = normalizeStoreRubro(storeRubro);

  if (rubro === "ropa-moda") {
    if (isFashionCatalogThemeId(theme)) {
      return theme;
    }
    if (theme === "minimal" || theme === "impact" || theme === "classic") {
      return LEGACY_TO_FASHION[theme];
    }
    return FASHION_CATALOG_THEME_IDS[0];
  }

  if (isFashionCatalogThemeId(theme)) {
    return FASHION_TO_LEGACY[theme];
  }

  return theme;
}

export function resolveCatalogDesign(
  design: Partial<CatalogDesignSettings> | undefined,
  storeRubro: string | null | undefined,
): Required<Pick<CatalogDesignSettings, "primaryColor" | "layout">> &
  CatalogDesignSettings {
  const rawTheme =
    normalizeCatalogTheme(design?.theme) ?? inferThemeFromLegacy(design);
  const theme = coerceThemeForRubro(rawTheme, storeRubro);
  const preset = CATALOG_THEME_PRESETS[theme];
  const palette = getRubroPalette(storeRubro);
  const fashionPalette = usesFashionThemePalette(storeRubro, theme);
  const saleMode = normalizeCatalogSaleMode(design?.saleMode);
  const visibility = normalizeCatalogVisibility(design?.visibility);

  const legacyColor =
    design?.primaryColor && HEX_COLOR_PATTERN.test(design.primaryColor)
      ? design.primaryColor.toLowerCase()
      : null;

  let primaryColor: string;
  if (fashionPalette) {
    primaryColor =
      design?.theme != null
        ? preset.primaryColor
        : (legacyColor ?? preset.primaryColor);
  } else {
    primaryColor = palette.primary;
  }

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

export function getCatalogRubroClass(storeRubro?: string | null): string {
  const rubro = normalizeStoreRubro(storeRubro);
  return `txn-catalog--rubro-${rubro}`;
}

export function getCatalogThemeStyle(
  design: CatalogDesignSettings,
  storeRubro?: string | null,
): CSSProperties {
  const resolved = resolveCatalogDesign(design, storeRubro);
  const preset = CATALOG_THEME_PRESETS[resolved.theme];
  const palette = getRubroPalette(storeRubro);
  const fashionPalette = usesFashionThemePalette(storeRubro, resolved.theme);

  const accentPrimary = fashionPalette
    ? normalizeHex6(resolved.primaryColor) ?? palette.primary
    : palette.primary;

  const accent = fashionPalette
    ? normalizeHex6(preset.accentColor ?? preset.previewAccent) ?? palette.accent
    : palette.accent;
  const pageBg = fashionPalette
    ? (preset.cssVars["--txn-page-bg"] ?? preset.pageBg)
    : palette.pageBg;

  const presetOverridesButtonColors = Boolean(
    preset.cssVars["--pc-btn-mobile-bg"] ||
      preset.cssVars["--pc-btn-desktop-bg"],
  );

  const accentVars = buildCatalogAccentCssVars({
    primary: accentPrimary,
    accent,
    pageBg,
    includeButtonVars: !(fashionPalette && presetOverridesButtonColors),
  });

  return {
    ...preset.cssVars,
    ...accentVars,
    ["--txn-page-bg" as string]: pageBg,
  } as CSSProperties;
}

export function getCatalogDesignClasses(
  design: CatalogDesignSettings,
  storeRubro?: string | null,
): string {
  const resolved = resolveCatalogDesign(design, storeRubro);

  return cn(
    getCatalogRubroClass(storeRubro),
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
