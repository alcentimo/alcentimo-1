import type {
  CatalogLayoutMode,
  CatalogSaleMode,
  CatalogThemeId,
} from "@/lib/store-settings/types";

export interface CatalogThemePreset {
  id: CatalogThemeId;
  label: string;
  description: string;
  primaryColor: string;
  layout: CatalogLayoutMode;
  previewBg: string;
  previewAccent: string;
  cssVars: Record<string, string>;
}

export interface CatalogSaleModePreset {
  id: CatalogSaleMode;
  label: string;
  description: string;
}

export const CATALOG_THEME_IDS: CatalogThemeId[] = ["minimal", "impact", "classic"];

export const CATALOG_SALE_MODE_IDS: CatalogSaleMode[] = ["quick", "showcase"];

export const CATALOG_THEME_PRESETS: Record<CatalogThemeId, CatalogThemePreset> = {
  minimal: {
    id: "minimal",
    label: "Minimalista",
    description: "Espacio generoso, tipografía sobria y botones discretos.",
    primaryColor: "#0d9488",
    layout: "grid",
    previewBg: "#fafafa",
    previewAccent: "#0d9488",
    cssVars: {
      "--pc-body-pad": "0.875rem",
      "--pc-grid-gap": "1.125rem",
      "--pc-btn-radius": "0.5rem",
      "--pc-btn-min-h": "2.25rem",
      "--pc-price-size": "0.9375rem",
      "--pc-title-size": "0.875rem",
    },
  },
  impact: {
    id: "impact",
    label: "Impacto",
    description: "Precio destacado, botones amplios y alta conversión.",
    primaryColor: "#059669",
    layout: "grid",
    previewBg: "#f0fdf4",
    previewAccent: "#059669",
    cssVars: {
      "--pc-body-pad": "0.625rem",
      "--pc-grid-gap": "0.875rem",
      "--pc-btn-radius": "0.75rem",
      "--pc-btn-min-h": "2.875rem",
      "--pc-price-size": "1.125rem",
      "--pc-title-size": "0.9375rem",
    },
  },
  classic: {
    id: "classic",
    label: "Clásico",
    description: "Vista en lista, estilo catálogo tradicional y ordenado.",
    primaryColor: "#0f766e",
    layout: "list",
    previewBg: "#f8fafc",
    previewAccent: "#0f766e",
    cssVars: {
      "--pc-body-pad": "0.75rem",
      "--pc-grid-gap": "0.75rem",
      "--pc-btn-radius": "0.375rem",
      "--pc-btn-min-h": "2.125rem",
      "--pc-price-size": "0.875rem",
      "--pc-title-size": "0.8125rem",
    },
  },
};

export const CATALOG_SALE_MODE_PRESETS: Record<CatalogSaleMode, CatalogSaleModePreset> = {
  quick: {
    id: "quick",
    label: "Venta Rápida",
    description: "Precio prominente y botón de compra grande para cerrar ventas al instante.",
  },
  showcase: {
    id: "showcase",
    label: "Vitrina",
    description: "Imagen protagonista y estética cuidada; el precio queda en segundo plano.",
  },
};
