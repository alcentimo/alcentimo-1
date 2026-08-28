const BRAND_MAX_LENGTH = 80;

/** Nombre de marca oficial visible en vitrina (columna products.brand). */
export function normalizeProductBrand(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, BRAND_MAX_LENGTH);
}

/** Clave estable para filtrar (sin acentos, minúsculas). */
export function productBrandKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveCatalogProductBrand(product: {
  brand?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  return normalizeProductBrand(product.brand);
}

export function brandsMatch(
  productBrand: string | null | undefined,
  selectedBrand: string | null | undefined,
): boolean {
  const selected = normalizeProductBrand(selectedBrand);
  if (!selected) return true;
  const resolved = normalizeProductBrand(productBrand);
  if (!resolved) return false;
  return productBrandKey(resolved) === productBrandKey(selected);
}

export interface CatalogBrandOption {
  name: string;
  key: string;
  count?: number;
  logoUrl?: string | null;
}

export function officialBrandsToCatalogOptions(
  brands: Array<{
    name: string;
    slug?: string;
    logoUrl?: string | null;
  }>,
  counts?: Map<string, number>,
): CatalogBrandOption[] {
  return brands
    .map((brand) => {
      const name = normalizeProductBrand(brand.name);
      if (!name) return null;
      const key = productBrandKey(name);
      return {
        name,
        key,
        count: counts?.get(key),
        logoUrl: brand.logoUrl ?? null,
      };
    })
    .filter((item): item is CatalogBrandOption => item != null);
}

export function extractCatalogBrands(
  products: Array<{
    brand?: string | null;
    metadata?: Record<string, unknown> | null;
  }>,
): CatalogBrandOption[] {
  const map = new Map<string, CatalogBrandOption>();

  for (const product of products) {
    const name = resolveCatalogProductBrand(product);
    if (!name) continue;
    const key = productBrandKey(name);
    const current = map.get(key);
    if (current) {
      current.count = (current.count ?? 0) + 1;
    } else {
      map.set(key, { name, key, count: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}
