import type { CatalogListItem } from "@/lib/database.types";

/** Orden clásico de menú para Alimentos y Bebidas. */
export const FOOD_MENU_CATEGORY_ORDER = [
  "entradas",
  "platos-principales",
  "bebidas",
  "postres",
] as const;

export interface FoodMenuSection {
  slug: string;
  name: string;
  products: CatalogListItem[];
}

export function groupProductsByFoodMenu(
  products: CatalogListItem[],
): FoodMenuSection[] {
  const bySlug = new Map<string, FoodMenuSection>();

  for (const product of products) {
    const slug = product.category_slug || "otros";
    const name = product.category_name || "Otros";
    const existing = bySlug.get(slug);
    if (existing) {
      existing.products.push(product);
    } else {
      bySlug.set(slug, { slug, name, products: [product] });
    }
  }

  const ordered: FoodMenuSection[] = [];
  for (const slug of FOOD_MENU_CATEGORY_ORDER) {
    const section = bySlug.get(slug);
    if (section) {
      ordered.push(section);
      bySlug.delete(slug);
    }
  }

  for (const section of bySlug.values()) {
    ordered.push(section);
  }

  return ordered;
}
