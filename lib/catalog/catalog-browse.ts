import type { CatalogListItem } from "@/lib/database.types";
import {
  brandsMatch,
  normalizeProductBrand,
  resolveCatalogProductBrand,
} from "@/lib/catalog/product-brand";

export type CatalogSortKey =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name_asc";

export const CATALOG_PAGE_SIZE = 20;

/** Productos cargados en el primer render del catálogo público (SSR). */
export const CATALOG_INITIAL_FETCH = 48;

/** Espera tras la última tecla antes de filtrar / consultar / sincronizar `?q=`. */
export const CATALOG_SEARCH_DEBOUNCE_MS = 400;

export const CATALOG_SORT_OPTIONS: ReadonlyArray<{
  value: CatalogSortKey;
  label: string;
}> = [
  { value: "featured", label: "Recomendados" },
  { value: "newest", label: "Más recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre A-Z" },
];

export function normalizeCatalogSearchText(value: string): string {
  return value.trim().toLowerCase();
}

/** Con stock disponible primero; agotados al final (estándar del catálogo público). */
export function compareCatalogStockAvailability(
  a: CatalogListItem,
  b: CatalogListItem,
): number {
  const rank = (product: CatalogListItem) =>
    product.available_stock > 0 ? 0 : 1;
  return rank(a) - rank(b);
}

export function matchesCatalogSearch(
  product: CatalogListItem,
  query: string,
): boolean {
  const normalized = normalizeCatalogSearchText(query);
  if (!normalized) return true;

  const haystack = [
    product.product_name,
    product.short_description,
    product.category_name,
    resolveCatalogProductBrand(product),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function parseCatalogPriceBound(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function normalizeCatalogPriceRange(
  minPrice: string | number | null | undefined,
  maxPrice: string | number | null | undefined,
): { min: number | null; max: number | null } {
  let min = parseCatalogPriceBound(minPrice);
  let max = parseCatalogPriceBound(maxPrice);
  if (min != null && max != null && min > max) {
    const swapped = min;
    min = max;
    max = swapped;
  }
  return { min, max };
}

export function matchesCatalogPrice(
  product: CatalogListItem,
  minPrice: string,
  maxPrice: string,
): boolean {
  const { min, max } = normalizeCatalogPriceRange(minPrice, maxPrice);
  if (min == null && max == null) return true;
  const price = product.price_usd ?? 0;
  if (min != null && price < min) return false;
  if (max != null && price > max) return false;
  return true;
}

export function filterCatalogProducts(
  products: CatalogListItem[],
  options: {
    searchQuery: string;
    categorySlug: string | null;
    brand?: string | null;
    minPrice?: string;
    maxPrice?: string;
  },
): CatalogListItem[] {
  return products.filter((product) => {
    if (
      options.categorySlug &&
      product.category_slug !== options.categorySlug
    ) {
      return false;
    }

    if (
      options.brand &&
      !brandsMatch(resolveCatalogProductBrand(product), options.brand)
    ) {
      return false;
    }

    if (!matchesCatalogPrice(product, options.minPrice ?? "", options.maxPrice ?? "")) {
      return false;
    }

    return matchesCatalogSearch(product, options.searchQuery);
  });
}

export function sortCatalogProducts(
  products: CatalogListItem[],
  sortKey: CatalogSortKey,
): CatalogListItem[] {
  const sorted = [...products];

  switch (sortKey) {
    case "newest":
      return sorted.sort((a, b) => {
        const stockOrder = compareCatalogStockAvailability(a, b);
        if (stockOrder !== 0) return stockOrder;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    case "price_asc":
      return sorted.sort((a, b) => {
        const stockOrder = compareCatalogStockAvailability(a, b);
        if (stockOrder !== 0) return stockOrder;
        return (
          (a.price_usd ?? Number.MAX_SAFE_INTEGER) -
          (b.price_usd ?? Number.MAX_SAFE_INTEGER)
        );
      });
    case "price_desc":
      return sorted.sort((a, b) => {
        const stockOrder = compareCatalogStockAvailability(a, b);
        if (stockOrder !== 0) return stockOrder;
        return (b.price_usd ?? 0) - (a.price_usd ?? 0);
      });
    case "name_asc":
      return sorted.sort((a, b) => {
        const stockOrder = compareCatalogStockAvailability(a, b);
        if (stockOrder !== 0) return stockOrder;
        return a.product_name.localeCompare(b.product_name, "es");
      });
    case "featured":
    default:
      return sorted.sort((a, b) => {
        const stockOrder = compareCatalogStockAvailability(a, b);
        if (stockOrder !== 0) return stockOrder;
        const trendA = a.hub_trend_score ?? 0;
        const trendB = b.hub_trend_score ?? 0;
        if (trendA !== trendB) return trendB - trendA;
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }
}

export function browseCatalogProducts(
  products: CatalogListItem[],
  options: {
    searchQuery: string;
    categorySlug: string | null;
    brand?: string | null;
    sortKey: CatalogSortKey;
    visibleCount: number;
    minPrice?: string;
    maxPrice?: string;
  },
) {
  const filtered = filterCatalogProducts(products, {
    searchQuery: options.searchQuery,
    categorySlug: options.categorySlug,
    brand: options.brand,
    minPrice: options.minPrice,
    maxPrice: options.maxPrice,
  });
  const sorted = sortCatalogProducts(filtered, options.sortKey);

  return {
    filteredProducts: sorted,
    visibleProducts: sorted.slice(0, options.visibleCount),
    totalCount: sorted.length,
    hasMore: sorted.length > options.visibleCount,
  };
}

export function hasActiveCatalogContentFilters(
  searchQuery: string,
  categorySlug: string | null,
  minPrice = "",
  maxPrice = "",
  brand: string | null = null,
): boolean {
  return (
    normalizeCatalogSearchText(searchQuery).length > 0 ||
    categorySlug != null ||
    parseCatalogPriceBound(minPrice) != null ||
    parseCatalogPriceBound(maxPrice) != null ||
    normalizeProductBrand(brand) != null
  );
}

export function hasActiveCatalogBrowseFilters(
  searchQuery: string,
  categorySlug: string | null,
  sortKey: CatalogSortKey,
  minPrice = "",
  maxPrice = "",
  brand: string | null = null,
): boolean {
  return (
    hasActiveCatalogContentFilters(
      searchQuery,
      categorySlug,
      minPrice,
      maxPrice,
      brand,
    ) || sortKey !== "featured"
  );
}
