import type { CSSProperties } from "react";
import {
  DEFAULT_STORE_RUBRO,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";
import type {
  CatalogDesignSettings,
  CatalogLayoutMode,
} from "@/lib/store-settings/types";

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

export function resolveCatalogDesign(
  design: CatalogDesignSettings | undefined,
  storeRubro: string | null | undefined,
): CatalogDesignSettings {
  const fallbackColor = getDefaultPrimaryColorForRubro(storeRubro);
  const primaryColor =
    design?.primaryColor && HEX_COLOR_PATTERN.test(design.primaryColor)
      ? design.primaryColor.toLowerCase()
      : fallbackColor;

  return {
    primaryColor,
    layout: normalizeCatalogLayout(design?.layout),
  };
}

export function getCatalogThemeStyle(primaryColor: string): CSSProperties {
  return {
    ["--txn-primary" as string]: primaryColor,
    ["--txn-primary-hover" as string]: primaryColor,
  };
}
