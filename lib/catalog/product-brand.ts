import { parseExtraFieldsFromMetadata } from "@/lib/products/extra-fields";

const BRAND_MAX_LENGTH = 80;

/** Nombre de marca visible (columna o campo extra «Marca»). */
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
  const fromColumn = normalizeProductBrand(product.brand);
  if (fromColumn) return fromColumn;

  const extra = parseExtraFieldsFromMetadata(product.metadata ?? null);
  return normalizeProductBrand(
    extra.Marca ?? extra.marca ?? extra.Brand ?? extra.brand ?? null,
  );
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
  count: number;
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
      current.count += 1;
    } else {
      map.set(key, { name, key, count: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}
