import {
  GIFT_CARD_CATEGORY_SLUG,
  GIFT_CARD_PRODUCT_SLUG,
  queryMatchesGiftCardProduct,
} from "@/lib/gift-cards/catalog";

/** Escapa comodines y caracteres que rompen filtros PostgREST `.or()`. */
export function sanitizeInventorySearch(raw: string): string {
  return raw
    .trim()
    .slice(0, 80)
    .replace(/[%_,.()\"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SEARCH_STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "y",
  "o",
  "a",
  "en",
  "con",
  "por",
  "para",
]);

/** Quita acentos y unifica guiones/espacios para comparar consultas. */
export function foldCatalogSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function catalogSearchTokens(query: string): string[] {
  const folded = foldCatalogSearchText(query);
  if (!folded) return [];
  const tokens = folded
    .split(" ")
    .filter((token) => token.length >= 2 && !SEARCH_STOPWORDS.has(token));
  return tokens.length > 0 ? tokens : folded.split(" ").filter(Boolean);
}

function postgrestIlikePattern(value: string): string {
  const compact = value.replace(/\s+/g, "%");
  return `%${compact}%`;
}

function searchOrForFields(pattern: string, fields: readonly string[]): string {
  return fields.map((field) => `${field}.ilike.${pattern}`).join(",");
}

const INVENTORY_SEARCH_FIELDS = [
  "product_name",
  "default_sku",
  "product_slug",
  "brand",
] as const;

export function buildInventorySearchOrFilter(query: string): string | null {
  const sanitized = sanitizeInventorySearch(query);
  if (!sanitized) return null;

  const tokens = catalogSearchTokens(sanitized);
  const wildcardSource =
    tokens.length > 0 ? tokens.join(" ") : sanitized.toLowerCase();
  const pattern = postgrestIlikePattern(wildcardSource);
  const slugHyphen = `%${wildcardSource.replace(/\s+/g, "-")}%`;

  return [
    searchOrForFields(pattern, INVENTORY_SEARCH_FIELDS),
    `product_slug.ilike.${slugHyphen}`,
  ].join(",");
}

const PUBLIC_CATALOG_EXTRA_SEARCH_FIELDS = [
  "short_description",
  "category_name",
  "category_slug",
] as const;

/** Búsqueda de vitrina: wildcard entre palabras + slug de tarjeta de regalo. */
export function buildPublicCatalogSearchOrFilter(query: string): string | null {
  const sanitized = sanitizeInventorySearch(query);
  if (!sanitized) return null;

  const base = buildInventorySearchOrFilter(sanitized);
  const tokens = catalogSearchTokens(sanitized);
  const wildcardSource =
    tokens.length > 0 ? tokens.join(" ") : sanitized.toLowerCase();
  const pattern = postgrestIlikePattern(wildcardSource);
  const extra = searchOrForFields(pattern, PUBLIC_CATALOG_EXTRA_SEARCH_FIELDS);
  const parts = [base, extra].filter(Boolean) as string[];

  if (queryMatchesGiftCardProduct(sanitized)) {
    parts.push(`product_slug.eq."${GIFT_CARD_PRODUCT_SLUG}"`);
    parts.push(`category_slug.eq."${GIFT_CARD_CATEGORY_SLUG}"`);
  }

  return parts.join(",");
}

/** Ventana de páginas para la UI (números + elipsis). */
export function getInventoryPageItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let delta = 1; delta <= 1; delta += 1) {
    pages.add(currentPage - delta);
    pages.add(currentPage + delta);
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
    previous = page;
  }
  return items;
}
