import type { CatalogListItem } from "@/lib/database.types";

export interface CatalogCategoryOption {
  slug: string;
  name: string;
}

export function extractCatalogCategories(
  products: CatalogListItem[],
): CatalogCategoryOption[] {
  const map = new Map<string, CatalogCategoryOption>();

  for (const product of products) {
    if (!product.category_slug || !product.category_name) continue;
    map.set(product.category_slug, {
      slug: product.category_slug,
      name: product.category_name,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}
