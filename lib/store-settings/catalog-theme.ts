import type { CSSProperties } from "react";
import {
  DEFAULT_STORE_RUBRO,
  normalizeStoreRubro,
} from "@/src/config/categories";
import { CATALOG_THEME_PRESETS } from "@/lib/store-settings/catalog-theme-presets";
import {
  buildCatalogAccentCssVars,
  getDefaultPrimaryColorForRubro,
  getRubroPalette,
} from "@/lib/store-settings/rubro-palettes";
import { normalizeHex6 } from "@/lib/store-settings/color-contrast";
import { normalizePromoBannerSettings } from "@/lib/store-settings/promo-banner";
import { normalizeCatalogFaqDraft } from "@/lib/store-settings/catalog-faq";
import {
  defaultAssistantAvatarSettings,
  normalizeAssistantAvatarSettings,
} from "@/lib/store-settings/assistant-avatar";
import {
  normalizeCatalogHeaderSettings,
  resolveCatalogHeaderBackground,
} from "@/lib/store-settings/catalog-header";
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
  if (value === "classic") {
    return "immersive";
  }

  if (
    value === "minimal" ||
    value === "impact" ||
    value === "immersive" ||
    value === "boutique" ||
    value === "rail" ||
    value === "mosaic" ||
    value === "profile" ||
    value === "compact" ||
    value === "fashion-pure" ||
    value === "fashion-nocturne" ||
    value === "fashion-editorial" ||
    value === "fashion-luxe"
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

/**
 * Catálogo público unificado: un solo layout marketplace (estilo Moriche).
 * Los ids históricos se normalizan a `minimal` para no romper datos guardados.
 */
export const STANDARD_CATALOG_THEME_ID: CatalogThemeId = "minimal";

/** Ajusta el tema al conjunto permitido por el rubro de la tienda. */
export function coerceThemeForRubro(
  _theme: CatalogThemeId,
  _storeRubro: string | null | undefined,
): CatalogThemeId {
  return STANDARD_CATALOG_THEME_ID;
}

export function resolveCatalogDesign(
  design: Partial<CatalogDesignSettings> | undefined,
  storeRubro: string | null | undefined,
): Required<Pick<CatalogDesignSettings, "primaryColor" | "layout">> &
  CatalogDesignSettings {
  const theme = STANDARD_CATALOG_THEME_ID;
  const palette = getRubroPalette(storeRubro);
  const saleMode: CatalogSaleMode = "quick";
  const visibility = normalizeCatalogVisibility(design?.visibility);

  const legacyColor =
    design?.primaryColor && HEX_COLOR_PATTERN.test(design.primaryColor)
      ? design.primaryColor.toLowerCase()
      : null;

  const primaryColor = legacyColor ?? palette.primary;
  const layout: CatalogLayoutMode = "grid";

  return {
    theme,
    saleMode,
    visibility,
    primaryColor,
    layout,
    promoBanner: normalizePromoBannerSettings(design?.promoBanner),
    faq: normalizeCatalogFaqDraft(design?.faq),
    header: normalizeCatalogHeaderSettings(design?.header),
    assistantAvatar: normalizeAssistantAvatarSettings(
      design?.assistantAvatar ?? defaultAssistantAvatarSettings(),
    ),
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

  const accentPrimary =
    normalizeHex6(resolved.primaryColor) ?? palette.primary;

  const accent = palette.accent;
  const pageBg = palette.pageBg;

  const accentVars = buildCatalogAccentCssVars({
    primary: accentPrimary,
    accent,
    pageBg,
    includeButtonVars: true,
  });

  const header = normalizeCatalogHeaderSettings(resolved.header);
  const themeHeaderBg =
    (preset.cssVars["--txn-header-bg"] as string | undefined) ?? undefined;
  const headerBg = resolveCatalogHeaderBackground(
    header,
    accentPrimary,
    themeHeaderBg,
  );

  const style: Record<string, string> = {
    ...preset.cssVars,
    ...accentVars,
    ["--txn-page-bg"]: pageBg,
    ["--sf-brand"]: accentPrimary,
    ["--sf-brand-soft"]: `color-mix(in srgb, ${accentPrimary} 14%, white)`,
    ["--sf-brand-ink"]: `color-mix(in srgb, ${accentPrimary} 72%, #0a0a0a)`,
  };

  if (headerBg.isCustom) {
    style["--txn-header-bg"] = headerBg.background;
    style["--txn-header-border"] = headerBg.background;
    if (headerBg.foreground) {
      style["--txn-header-fg"] = headerBg.foreground;
      style["--txn-page-fg-header"] = headerBg.foreground;
    }
  }

  if (header.coverImageUrl) {
    style["--txn-header-cover"] = `url(${JSON.stringify(header.coverImageUrl)})`;
  }

  return style as CSSProperties;
}

export function getCatalogDesignClasses(
  design: CatalogDesignSettings,
  storeRubro?: string | null,
): string {
  const resolved = resolveCatalogDesign(design, storeRubro);
  const header = normalizeCatalogHeaderSettings(resolved.header);

  return cn(
    getCatalogRubroClass(storeRubro),
    "txn-catalog--marketplace",
    `txn-catalog--theme-${STANDARD_CATALOG_THEME_ID}`,
    "txn-catalog--sale-quick",
    `txn-catalog--header-${header.alignment}`,
    header.bgMode !== "theme" && "txn-catalog--header-custom-bg",
    Boolean(header.coverImageUrl) && "txn-catalog--header-cover",
    !resolved.visibility.showDescription && "txn-catalog--hide-desc",
    !resolved.visibility.showPrices && "txn-catalog--hide-prices",
    !resolved.visibility.showStock && "txn-catalog--hide-stock",
  );
}

export function getCatalogProductGridClassName(
  _design: CatalogDesignSettings,
  _storeRubro?: string | null,
  extra?: string,
): string {
  return cn("txn-product-grid txn-product-grid--marketplace", extra);
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
