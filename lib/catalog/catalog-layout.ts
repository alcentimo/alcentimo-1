import type { CatalogLayoutMode } from "@/lib/store-settings/types";

export interface CatalogLayoutOption {
  id: CatalogLayoutMode;
  label: string;
  tagline: string;
  description: string;
}

/** Opciones de disposición de productos en el catálogo público. */
export const CATALOG_LAYOUT_OPTIONS: CatalogLayoutOption[] = [
  {
    id: "list",
    label: "Tarjeta grande",
    tagline: "Compacta",
    description:
      "Móvil: 1 columna. PC: 2 columnas. Ideal para destacar cada producto.",
  },
  {
    id: "grid",
    label: "Cuadrícula",
    tagline: "Densa",
    description:
      "Móvil: 2 columnas. PC: 4 columnas. Ideal para catálogos densos.",
  },
];

/** Breakpoint donde el catálogo pasa de móvil (1/2 cols) a PC (2/4 cols). */
export const CATALOG_DESKTOP_LAYOUT_MQ = "(min-width: 1024px)";

export function getCatalogLayoutOption(
  layout: CatalogLayoutMode,
): CatalogLayoutOption {
  return (
    CATALOG_LAYOUT_OPTIONS.find((option) => option.id === layout) ??
    CATALOG_LAYOUT_OPTIONS[1]
  );
}

const STORAGE_PREFIX = "alcentimo-catalog-layout:";

export function catalogLayoutStorageKey(storeSlug: string): string {
  return `${STORAGE_PREFIX}${storeSlug}`;
}

export function readStoredCatalogLayout(
  storeSlug: string,
): CatalogLayoutMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(
      catalogLayoutStorageKey(storeSlug),
    );
    return value === "list" || value === "grid" ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredCatalogLayout(
  storeSlug: string,
  layout: CatalogLayoutMode,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(catalogLayoutStorageKey(storeSlug), layout);
  } catch {
    // ignore quota / private mode
  }
}
