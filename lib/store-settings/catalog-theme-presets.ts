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
  "immersive",
];

/**
 * Plantillas estructurales (layouts distintos): se ofrecen a todos los rubros
 * sin alterar el tema por defecto (`minimal` / fashion-pure).
 */
export const STRUCTURAL_CATALOG_THEME_IDS: CatalogThemeId[] = [
  "boutique",
  "rail",
  "mosaic",
  "profile",
  "compact",
];

/** Temas exclusivos para tiendas de Ropa y Moda (orden: claro → cálido → oscuro → lujo). */
export const FASHION_CATALOG_THEME_IDS: CatalogThemeId[] = [
  "fashion-pure",
  "fashion-editorial",
  "fashion-nocturne",
  "fashion-luxe",
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
  immersive: {
    id: "immersive",
    label: "Inmersivo",
    description:
      "Fotos protagonistas en formato feed, textos superpuestos y compra rápida en móvil.",
    primaryColor: "#7c3aed",
    layout: "grid",
    pageBg: "#f4f4f5",
    previewBg: "#f4f4f5",
    previewAccent: "#7c3aed",
    cssVars: {
      "--pc-body-pad": "0.75rem",
      "--pc-grid-gap": "0.625rem",
      "--pc-btn-radius": "0.75rem",
      "--pc-btn-min-h": "2.625rem",
      "--pc-price-size": "1rem",
      "--pc-title-size": "0.875rem",
      "--pc-radius": "1rem",
      "--pc-media-ratio": "4 / 5",
    },
  },
  boutique: {
    id: "boutique",
    label: "Boutique",
    tagline: "1 columna",
    description:
      "Tarjetas amplias a una columna en móvil, foto vertical y botón de compra a lo ancho.",
    primaryColor: "#0f766e",
    layout: "grid",
    pageBg: "#fafafa",
    previewBg: "#fafafa",
    previewAccent: "#0f766e",
    cssVars: {
      "--pc-body-pad": "1rem",
      "--pc-grid-gap": "1.25rem",
      "--pc-btn-radius": "0.75rem",
      "--pc-btn-min-h": "2.75rem",
      "--pc-price-size": "1.125rem",
      "--pc-title-size": "1rem",
      "--pc-radius": "1.125rem",
      "--pc-media-ratio": "3 / 4",
      "--pc-media-inset": "0px",
    },
  },
  rail: {
    id: "rail",
    label: "Carril",
    tagline: "Horizontal",
    description:
      "Filas horizontales: imagen a la izquierda e info + botón a la derecha, tipo listado.",
    primaryColor: "#0369a1",
    layout: "grid",
    pageBg: "#ffffff",
    previewBg: "#f8fafc",
    previewAccent: "#0369a1",
    cssVars: {
      "--pc-body-pad": "0.75rem",
      "--pc-grid-gap": "0.75rem",
      "--pc-btn-radius": "0.625rem",
      "--pc-btn-min-h": "2.375rem",
      "--pc-price-size": "1rem",
      "--pc-title-size": "0.9375rem",
      "--pc-radius": "0.875rem",
      "--pc-media-ratio": "1 / 1",
      "--pc-media-inset": "0px",
    },
  },
  mosaic: {
    id: "mosaic",
    label: "Mosaico",
    tagline: "Destacados",
    description:
      "Cuadrícula asimétrica: cada tercer producto se amplía a dos columnas para resaltar.",
    primaryColor: "#b45309",
    layout: "grid",
    pageBg: "#fffbeb",
    previewBg: "#fffbeb",
    previewAccent: "#b45309",
    cssVars: {
      "--pc-body-pad": "0.75rem",
      "--pc-grid-gap": "0.75rem",
      "--pc-btn-radius": "0.5rem",
      "--pc-btn-min-h": "2.5rem",
      "--pc-price-size": "0.9375rem",
      "--pc-title-size": "0.8125rem",
      "--pc-radius": "0.75rem",
      "--pc-media-ratio": "1 / 1",
      "--pc-media-inset": "0px",
    },
  },
  profile: {
    id: "profile",
    label: "Foto circular",
    tagline: "Estilo perfil",
    description:
      "Logo o foto de la tienda en círculo destacado, tipo perfil de mensajería, junto al nombre.",
    primaryColor: "#0e7490",
    layout: "grid",
    pageBg: "#f8fafc",
    previewBg: "#f8fafc",
    previewAccent: "#0e7490",
    cssVars: {
      "--pc-body-pad": "0.75rem",
      "--pc-grid-gap": "0.875rem",
      "--pc-btn-radius": "9999px",
      "--pc-btn-min-h": "2.375rem",
      "--pc-price-size": "0.9375rem",
      "--pc-title-size": "0.8125rem",
      "--pc-radius": "1rem",
      "--pc-media-ratio": "1 / 1",
      "--pc-media-inset": "0px",
    },
  },
  compact: {
    id: "compact",
    label: "Compacta",
    tagline: "Más productos",
    description:
      "Tarjetas ultra reducidas y más columnas para ver muchos productos de un vistazo.",
    primaryColor: "#334155",
    layout: "grid",
    pageBg: "#ffffff",
    previewBg: "#f1f5f9",
    previewAccent: "#334155",
    cssVars: {
      "--pc-body-pad": "0.4rem",
      "--pc-grid-gap": "0.5rem",
      "--pc-btn-radius": "0.375rem",
      "--pc-btn-min-h": "1.875rem",
      "--pc-price-size": "0.75rem",
      "--pc-title-size": "0.6875rem",
      "--pc-radius": "0.5rem",
      "--pc-media-ratio": "1 / 1",
      "--pc-media-inset": "0px",
      "--pc-gap": "0.15rem",
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
  "fashion-luxe": {
    id: "fashion-luxe",
    label: "Lujo Editorial",
    tagline: "Quiet Luxury",
    description:
      "Estética alta costura: blanco puro, grafito y marfil sobrio; tipografía espaciada y etiquetas discretas.",
    primaryColor: "#1a1a1a",
    /** Champagne grafito — sin naranja estridente en OFERTA. */
    accentColor: "#8a8074",
    layout: "grid",
    pageBg: "#f7f6f4",
    previewBg: "#f7f6f4",
    previewAccent: "#1a1a1a",
    cssVars: {
      ...BASE_DENSITY,
      "--txn-page-bg": "#f7f6f4",
      "--txn-page-fg": "#1a1a1a",
      "--txn-header-bg": "rgba(247, 246, 244, 0.96)",
      "--txn-header-border": "#e6e4e0",
      "--pc-surface": "#ffffff",
      "--pc-fg": "#1a1a1a",
      "--pc-fg-muted": "#6b6b6b",
      "--pc-fg-meta": "#9a9a9a",
      "--pc-border": "#e8e6e2",
      "--pc-media-bg": "#f0eeeb",
      "--pc-btn-radius": "0",
      "--pc-radius": "0",
      "--pc-body-pad": "1rem",
      "--pc-grid-gap": "1.5rem",
      "--pc-price-size": "0.875rem",
      "--pc-title-size": "0.75rem",
      "--pc-badge-bg": "rgba(255, 255, 255, 0.92)",
      "--pc-badge-fg": "#4a4a4a",
      "--pc-stock-low-bg": "rgba(255, 255, 255, 0.92)",
      "--pc-stock-low-fg": "#6b6b6b",
      "--txn-title-tracking": "0.14em",
      "--txn-title-weight": "400",
      "--txn-product-tracking": "0.16em",
      "--txn-product-weight": "400",
      "--txn-product-transform": "uppercase",
      "--txn-empty-bg": "#ffffff",
      "--txn-empty-border": "#e8e6e2",
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
): theme is
  | "fashion-pure"
  | "fashion-nocturne"
  | "fashion-editorial"
  | "fashion-luxe" {
  return (
    theme === "fashion-pure" ||
    theme === "fashion-nocturne" ||
    theme === "fashion-editorial" ||
    theme === "fashion-luxe"
  );
}

export function isStructuralCatalogThemeId(
  theme: string | null | undefined,
): theme is "boutique" | "rail" | "mosaic" | "profile" | "compact" {
  return (
    theme === "boutique" ||
    theme === "rail" ||
    theme === "mosaic" ||
    theme === "profile" ||
    theme === "compact"
  );
}

export function getCatalogThemeIdsForRubro(
  rubro: string | null | undefined,
): CatalogThemeId[] {
  const base =
    rubro === "ropa-moda" ? FASHION_CATALOG_THEME_IDS : CATALOG_THEME_IDS;
  return [...base, ...STRUCTURAL_CATALOG_THEME_IDS];
}
