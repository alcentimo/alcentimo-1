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
  /** Fondo de página / PWA background_color */
  pageBg: string;
  previewBg: string;
  previewAccent: string;
  cssVars: Record<string, string>;
}

export interface CatalogSaleModePreset {
  id: CatalogSaleMode;
  label: string;
  description: string;
}

export const CATALOG_THEME_IDS: CatalogThemeId[] = [
  "minimal",
  "impact",
  "classic",
];

/** Temas exclusivos para tiendas de Ropa y Moda. */
export const FASHION_CATALOG_THEME_IDS: CatalogThemeId[] = [
  "fashion-pure",
  "fashion-nocturne",
  "fashion-editorial",
];

export const CATALOG_SALE_MODE_IDS: CatalogSaleMode[] = ["quick", "showcase"];

const BASE_DENSITY = {
  "--pc-body-pad": "0.875rem",
  "--pc-grid-gap": "1.125rem",
  "--pc-btn-radius": "0.5rem",
  "--pc-btn-min-h": "2.25rem",
  "--pc-price-size": "0.9375rem",
  "--pc-title-size": "0.875rem",
} as const;

export const CATALOG_THEME_PRESETS: Record<CatalogThemeId, CatalogThemePreset> = {
  minimal: {
    id: "minimal",
    label: "Minimalista",
    description: "Espacio generoso, tipografía sobria y botones discretos.",
    primaryColor: "#0d9488",
    layout: "grid",
    pageBg: "#ffffff",
    previewBg: "#fafafa",
    previewAccent: "#0d9488",
    cssVars: { ...BASE_DENSITY },
  },
  impact: {
    id: "impact",
    label: "Impacto",
    description: "Precio destacado, botones amplios y alta conversión.",
    primaryColor: "#059669",
    layout: "grid",
    pageBg: "#ffffff",
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
    pageBg: "#ffffff",
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
  "fashion-pure": {
    id: "fashion-pure",
    label: "Blanco Puro",
    description:
      "Minimalista boutique: fondo claro, tipografía limpia y acento negro (estilo Zara).",
    primaryColor: "#171717",
    layout: "grid",
    pageBg: "#fafafa",
    previewBg: "#fafafa",
    previewAccent: "#171717",
    cssVars: {
      ...BASE_DENSITY,
      "--txn-page-bg": "#fafafa",
      "--txn-page-fg": "#171717",
      "--txn-header-bg": "rgba(250, 250, 250, 0.92)",
      "--txn-header-border": "#e5e5e5",
      "--pc-surface": "#ffffff",
      "--pc-fg": "#171717",
      "--pc-fg-muted": "#737373",
      "--pc-fg-meta": "#a3a3a3",
      "--pc-border": "#e5e5e5",
      "--pc-media-bg": "#f4f4f5",
      "--pc-btn-radius": "0.125rem",
      "--pc-title-size": "0.8125rem",
      "--txn-title-tracking": "0.04em",
      "--txn-title-weight": "500",
      "--txn-product-tracking": "0.06em",
      "--txn-product-weight": "500",
      "--txn-product-transform": "uppercase",
    },
  },
  "fashion-nocturne": {
    id: "fashion-nocturne",
    label: "Contraste Sofisticado",
    description:
      "Nocturno mate: fondo negro/gris oscuro y texto blanco para moda urbana o alta costura.",
    primaryColor: "#f5f5f4",
    layout: "grid",
    pageBg: "#0a0a0a",
    previewBg: "#0a0a0a",
    previewAccent: "#f5f5f4",
    cssVars: {
      ...BASE_DENSITY,
      "--txn-page-bg": "#0a0a0a",
      "--txn-page-fg": "#f5f5f4",
      "--txn-header-bg": "rgba(10, 10, 10, 0.92)",
      "--txn-header-border": "#262626",
      "--pc-surface": "#141414",
      "--pc-fg": "#f5f5f4",
      "--pc-fg-muted": "#a3a3a3",
      "--pc-fg-meta": "#737373",
      "--pc-border": "#262626",
      "--pc-media-bg": "#1a1a1a",
      "--pc-btn-radius": "0.125rem",
      "--pc-btn-mobile-bg": "#141414",
      "--pc-btn-desktop-bg": "#141414",
      "--pc-badge-bg": "rgba(20, 20, 20, 0.92)",
      "--pc-badge-fg": "#a3a3a3",
      "--pc-stock-low-bg": "rgba(38, 38, 38, 0.95)",
      "--pc-stock-low-fg": "#a3a3a3",
      "--pc-title-size": "0.8125rem",
      "--txn-title-tracking": "0.06em",
      "--txn-title-weight": "500",
      "--txn-product-tracking": "0.08em",
      "--txn-product-weight": "500",
      "--txn-product-transform": "uppercase",
      "--txn-empty-bg": "#141414",
      "--txn-empty-border": "#262626",
    },
  },
  "fashion-editorial": {
    id: "fashion-editorial",
    label: "Neutro Cálido",
    description:
      "Editorial en arena, beige y marfil: ideal para lino, casual o artesanal.",
    primaryColor: "#6b5744",
    layout: "grid",
    pageBg: "#f3eee6",
    previewBg: "#f3eee6",
    previewAccent: "#6b5744",
    cssVars: {
      ...BASE_DENSITY,
      "--txn-page-bg": "#f3eee6",
      "--txn-page-fg": "#3d3429",
      "--txn-header-bg": "rgba(243, 238, 230, 0.92)",
      "--txn-header-border": "#e4d9c8",
      "--pc-surface": "#faf7f2",
      "--pc-fg": "#3d3429",
      "--pc-fg-muted": "#8a7e6e",
      "--pc-fg-meta": "#a89984",
      "--pc-border": "#e4d9c8",
      "--pc-media-bg": "#ebe4d8",
      "--pc-btn-radius": "0.25rem",
      "--pc-title-size": "0.875rem",
      "--txn-title-tracking": "0.02em",
      "--txn-title-weight": "600",
      "--txn-product-tracking": "0.02em",
      "--txn-product-weight": "500",
      "--txn-product-transform": "none",
      "--txn-empty-bg": "#faf7f2",
      "--txn-empty-border": "#e4d9c8",
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

export function isFashionCatalogThemeId(
  theme: string | null | undefined,
): theme is "fashion-pure" | "fashion-nocturne" | "fashion-editorial" {
  return (
    theme === "fashion-pure" ||
    theme === "fashion-nocturne" ||
    theme === "fashion-editorial"
  );
}

export function getCatalogThemeIdsForRubro(
  rubro: string | null | undefined,
): CatalogThemeId[] {
  return rubro === "ropa-moda" ? FASHION_CATALOG_THEME_IDS : CATALOG_THEME_IDS;
}
