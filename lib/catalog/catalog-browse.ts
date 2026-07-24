import type { CatalogListItem } from "@/lib/database.types";

export type CatalogSortKey =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name_asc";

export const CATALOG_PAGE_SIZE = 20;

/** Productos cargados en el primer render del catálogo público (SSR). */
export const CATALOG_INITIAL_FETCH = 48;

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
    product.brand,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function filterCatalogProducts(
  products: CatalogListItem[],
  options: {
    searchQuery: string;
    categorySlug: string | null;
  },
): CatalogListItem[] {
  return products.filter((product) => {
    if (
      options.categorySlug &&
      product.category_slug !== options.categorySlug
    ) {
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
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "price_asc":
      return sorted.sort(
        (a, b) => (a.price_usd ?? Number.MAX_SAFE_INTEGER) - (b.price_usd ?? Number.MAX_SAFE_INTEGER),
      );
    case "price_desc":
      return sorted.sort(
        (a, b) => (b.price_usd ?? 0) - (a.price_usd ?? 0),
      );
    case "name_asc":
      return sorted.sort((a, b) =>
        a.product_name.localeCompare(b.product_name, "es"),
      );
    case "featured":
    default:
      return sorted.sort((a, b) => {
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
    sortKey: CatalogSortKey;
    visibleCount: number;
  },
) {
  const filtered = filterCatalogProducts(products, {
    searchQuery: options.searchQuery,
    categorySlug: options.categorySlug,
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
): boolean {
  return (
    normalizeCatalogSearchText(searchQuery).length > 0 || categorySlug != null
  );
}

export function hasActiveCatalogBrowseFilters(
  searchQuery: string,
  categorySlug: string | null,
  sortKey: CatalogSortKey,
): boolean {
  return hasActiveCatalogContentFilters(searchQuery, categorySlug) || sortKey !== "featured";
}
