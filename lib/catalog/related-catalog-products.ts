import type { CatalogListItem } from "@/lib/database.types";

const RELATED_LIMIT = 12;

export function pickRelatedCatalogProducts(
  product: CatalogListItem,
  catalog: CatalogListItem[] | undefined,
  limit = RELATED_LIMIT,
): CatalogListItem[] {
  if (!catalog || catalog.length === 0) return [];

  const others = catalog.filter(
    (item) => item.product_id !== product.product_id,
  );
  if (others.length === 0) return [];

  const scored = others.map((item) => {
    let score = 0;
    if (item.category_id && item.category_id === product.category_id) score += 4;
    if (
      item.category_slug &&
      product.category_slug &&
      item.category_slug === product.category_slug
    ) {
      score += 3;
    }
    const brandA = item.brand?.trim().toLowerCase();
    const brandB = product.brand?.trim().toLowerCase();
    if (brandA && brandB && brandA === brandB) score += 2;
    if (item.is_featured) score += 1;
    if ((item.hub_trend_score ?? 0) > 0) score += 0.5;
    return { item, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.item.hub_trend_score ?? 0) - (a.item.hub_trend_score ?? 0);
  });

  return scored.slice(0, limit).map((entry) => entry.item);
}
