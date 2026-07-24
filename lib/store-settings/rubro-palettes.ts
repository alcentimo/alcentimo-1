import {
  DEFAULT_STORE_RUBRO,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";
import {
  darkenHex,
  getAccessibleForeground,
  mixHexColors,
  normalizeHex6,
  relativeLuminance,
} from "@/lib/store-settings/color-contrast";

export interface RubroPalette {
  rubro: StoreRubro;
  label: string;
  /** Botones principales, tabs activos, FAB del carrito. */
  primary: string;
  /** Insignias de oferta y alertas comerciales. */
  accent: string;
  /** Fondo de página del catálogo público. */
  pageBg: string;
}

/** Paletas curadas por rubro — tonos profesionales, no aleatorios. */
export const RUBRO_PALETTES: Record<StoreRubro, RubroPalette> = {
  "ropa-moda": {
    rubro: "ropa-moda",
    label: "Moda",
    primary: "#171717",
    accent: "#c2410c",
    pageBg: "#fafafa",
  },
  alimentos: {
    rubro: "alimentos",
    label: "Alimentos",
    primary: "#15803d",
    accent: "#c2410c",
    pageBg: "#fffaf5",
  },
  tecnologia: {
    rubro: "tecnologia",
    label: "Tecnología",
    primary: "#1d4ed8",
    accent: "#dc2626",
    pageBg: "#f8fafc",
  },
  coleccionables: {
    rubro: "coleccionables",
    label: "Coleccionables",
    primary: "#b45309",
    accent: "#7c2d12",
    pageBg: "#fffbeb",
  },
  "salud-belleza": {
    rubro: "salud-belleza",
    label: "Salud y Belleza",
    primary: "#be185d",
    accent: "#db2777",
    pageBg: "#fff1f2",
  },
  "papeleria-libreria-oficina": {
    rubro: "papeleria-libreria-oficina",
    label: "Papelería y Oficina",
    primary: "#1e3a8a",
    accent: "#0f766e",
    pageBg: "#f8fafc",
  },
};

export function getRubroPalette(rubro: string | null | undefined): RubroPalette {
  const normalized = normalizeStoreRubro(rubro);
  return RUBRO_PALETTES[normalized] ?? RUBRO_PALETTES[DEFAULT_STORE_RUBRO];
}

export function getDefaultPrimaryColorForRubro(
  rubro: string | null | undefined,
): string {
  return getRubroPalette(rubro).primary;
}

/** Variables CSS de acento con contraste automático sobre botones y fondos. */
export function buildCatalogAccentCssVars(input: {
  primary: string;
  accent?: string;
  pageBg?: string;
  includeButtonVars?: boolean;
}): Record<string, string> {
  const primary = normalizeHex6(input.primary) ?? RUBRO_PALETTES[DEFAULT_STORE_RUBRO].primary;
  const accent =
    normalizeHex6(input.accent ?? primary) ?? primary;
  const primaryFg = getAccessibleForeground(primary);
  const accentFg = getAccessibleForeground(accent);
  const primaryHover = darkenHex(primary, 0.12);
  const isDarkSurface = input.pageBg
    ? relativeLuminance(input.pageBg) < 0.35
    : false;
  const primaryMuted = isDarkSurface
    ? mixHexColors(primary, input.pageBg ?? "#141414", 0.22)
    : mixHexColors(primary, "#ffffff", 0.12);
  const primaryMutedFg = isDarkSurface
    ? primary
    : relativeLuminance(primaryMuted) > 0.55
      ? darkenHex(primary, 0.28)
      : primary;
  const primaryBorder = isDarkSurface
    ? mixHexColors(primary, "#404040", 0.35)
    : mixHexColors(primary, "#ffffff", 0.55);
  const primaryRing = isDarkSurface
    ? mixHexColors(primary, "#000000", 0.65)
    : mixHexColors(primary, "#ffffff", 0.82);
  const includeButtonVars = input.includeButtonVars !== false;

  const vars: Record<string, string> = {
    "--txn-primary": primary,
    "--txn-primary-hover": primaryHover,
    "--txn-primary-fg": primaryFg,
    "--txn-primary-muted": primaryMuted,
    "--txn-primary-muted-fg": primaryMutedFg,
    "--txn-primary-border": primaryBorder,
    "--txn-primary-ring": primaryRing,
    "--txn-accent": accent,
    "--txn-accent-fg": accentFg,
  };

  if (includeButtonVars) {
    vars["--pc-btn-mobile-bg"] = primary;
    vars["--pc-btn-mobile-fg"] = primaryFg;
    vars["--pc-btn-mobile-border"] = primary;
    vars["--pc-btn-desktop-bg"] = primary;
    vars["--pc-btn-desktop-fg"] = primaryFg;
  }

  if (input.pageBg) {
    vars["--txn-page-bg"] = input.pageBg;
  }

  return vars;
}
