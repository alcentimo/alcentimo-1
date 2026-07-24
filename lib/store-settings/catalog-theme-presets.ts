import type {
  CatalogLayoutMode,
  CatalogSaleMode,
  CatalogThemeId,
} from "@/lib/store-settings/types";

export interface CatalogThemePreset {
  id: CatalogThemeId;
  label: string;
  /** Subtítulo corto para el panel de diseño (moda). */
  tagline?: string;
  description: string;
  primaryColor: string;
  /** Insignias de oferta y detalles comerciales. */
  accentColor?: string;
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

/** Temas exclusivos para tiendas de Ropa y Moda (orden: claro → cálido → oscuro). */
export const FASHION_CATALOG_THEME_IDS: CatalogThemeId[] = [
  "fashion-pure",
  "fashion-editorial",
  "fashion-nocturne",
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
    label: "Minimalista",
    tagline: "Clean & Light",
    description:
      "Fondo perla, tarjetas blancas y acentos en negro puro para una boutique moderna.",
    primaryColor: "#0a0a0a",
    accentColor: "#c2410c",
    layout: "grid",
    pageBg: "#faf9f7",
    previewBg: "#faf9f7",
    previewAccent: "#0a0a0a",
    cssVars: {
      ...BASE_DENSITY,
      "--txn-page-bg": "#faf9f7",
      "--txn-page-fg": "#0a0a0a",
      "--txn-header-bg": "rgba(250, 249, 247, 0.94)",
      "--txn-header-border": "#e8e8e6",
      "--pc-surface": "#ffffff",
      "--pc-fg": "#0a0a0a",
      "--pc-fg-muted": "#525252",
      "--pc-fg-meta": "#a3a3a3",
      "--pc-border": "#ececea",
      "--pc-media-bg": "#f5f5f4",
      "--pc-btn-radius": "0.125rem",
      "--pc-title-size": "0.8125rem",
      "--txn-title-tracking": "0.05em",
      "--txn-title-weight": "500",
      "--txn-product-tracking": "0.07em",
      "--txn-product-weight": "500",
      "--txn-product-transform": "uppercase",
      "--txn-empty-bg": "#ffffff",
      "--txn-empty-border": "#ececea",
    },
  },
  "fashion-editorial": {
    id: "fashion-editorial",
    label: "Neutro Cálido",
    tagline: "Warm Neutral",
    description:
      "Arena, crema e marfil suaves que transmiten tendencia y cercanía en moda casual.",
    primaryColor: "#6b5744",
    accentColor: "#9a3412",
    layout: "grid",
    pageBg: "#f4efe6",
    previewBg: "#f4efe6",
    previewAccent: "#6b5744",
    cssVars: {
      ...BASE_DENSITY,
      "--txn-page-bg": "#f4efe6",
      "--txn-page-fg": "#3d3429",
      "--txn-header-bg": "rgba(244, 239, 230, 0.94)",
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
  "fashion-nocturne": {
    id: "fashion-nocturne",
    label: "Editorial Oscuro",
    tagline: "Dark Fashion",
    description:
      "Gris carbón profundo, tipografía clara y composición sofisticada tipo revista de moda.",
    primaryColor: "#e7e5e4",
    accentColor: "#fbbf24",
    layout: "grid",
    pageBg: "#141414",
    previewBg: "#141414",
    previewAccent: "#e7e5e4",
    cssVars: {
      ...BASE_DENSITY,
      "--txn-page-bg": "#141414",
      "--txn-page-fg": "#f5f5f4",
      "--txn-header-bg": "rgba(20, 20, 20, 0.94)",
      "--txn-header-border": "#2a2a2a",
      "--pc-surface": "#1c1c1c",
      "--pc-fg": "#f5f5f4",
      "--pc-fg-muted": "#a3a3a3",
      "--pc-fg-meta": "#737373",
      "--pc-border": "#2a2a2a",
      "--pc-media-bg": "#222222",
      "--pc-btn-radius": "0.125rem",
      "--pc-btn-mobile-bg": "#262626",
      "--pc-btn-desktop-bg": "#262626",
      "--pc-btn-mobile-fg": "#fafafa",
      "--pc-btn-desktop-fg": "#fafafa",
      "--pc-btn-mobile-border": "#404040",
      "--pc-badge-bg": "rgba(28, 28, 28, 0.92)",
      "--pc-badge-fg": "#d4d4d4",
      "--pc-stock-low-bg": "rgba(38, 38, 38, 0.95)",
      "--pc-stock-low-fg": "#a3a3a3",
      "--pc-title-size": "0.8125rem",
      "--txn-title-tracking": "0.07em",
      "--txn-title-weight": "500",
      "--txn-product-tracking": "0.09em",
      "--txn-product-weight": "500",
      "--txn-product-transform": "uppercase",
      "--txn-empty-bg": "#1c1c1c",
      "--txn-empty-border": "#2a2a2a",
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
