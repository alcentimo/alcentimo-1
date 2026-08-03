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
    tagline: "Lista",
    description:
      "Una columna con fotos amplias. Ideal para destacar cada producto.",
  },
  {
    id: "grid",
    label: "Dos columnas",
    tagline: "Cuadrícula",
    description:
      "Más productos a la vista en el móvil. Ideal para ropa y catálogos densos.",
  },
];

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
