import { computeUsdToVes } from "@/lib/catalog/pricing";

export interface ProductVariantJson {
  id: string;
  name: string;
  price_extra_usd: number;
  stock: number;
  /** Atributos estructurados del módulo de rubro (p. ej. talla/color). */
  attributes?: Record<string, string>;
}

export interface VariantFormInput {
  id?: string;
  name: string;
  priceExtraUsd: string;
  stock: string;
  attributes?: Record<string, string>;
}

function parseAttributes(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        entry[1].trim().length > 0,
    )
    .map(([key, value]) => [key, value.trim()] as const);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function parseVariantsJson(raw: unknown): ProductVariantJson[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      name: typeof item.name === "string" ? item.name.trim() : "",
      price_extra_usd:
        typeof item.price_extra_usd === "number" && Number.isFinite(item.price_extra_usd)
          ? item.price_extra_usd
          : parseFloat(String(item.price_extra_usd ?? 0)) || 0,
      stock:
        typeof item.stock === "number" && Number.isFinite(item.stock)
          ? Math.max(0, Math.floor(item.stock))
          : Math.max(0, parseInt(String(item.stock ?? 0), 10) || 0),
      attributes: parseAttributes(item.attributes),
    }))
    .filter((v) => v.name.length > 0);
}

export function parseVariantFormInputs(raw: string): {
  variants: ProductVariantJson[];
  error?: string;
} {
  if (!raw.trim()) {
    return { variants: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { variants: [], error: "Formato de variantes inválido." };
  }

  if (!Array.isArray(parsed)) {
    return { variants: [], error: "Las variantes deben ser una lista." };
  }

  const variants: ProductVariantJson[] = [];

  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    const priceExtra = parseFloat(String(row.priceExtraUsd ?? row.price_extra_usd ?? 0));
    const stock = parseInt(String(row.stock ?? 0), 10);

    if (!name) continue;
    if (!Number.isFinite(priceExtra) || priceExtra < 0) {
      return { variants: [], error: `Precio extra inválido en "${name}".` };
    }
    if (!Number.isFinite(stock) || stock < 0) {
      return { variants: [], error: `Stock inválido en "${name}".` };
    }

    variants.push({
      id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
      name,
      price_extra_usd: priceExtra,
      stock,
      attributes: parseAttributes(row.attributes),
    });
  }

  return { variants };
}

export interface CatalogVariantOption {
  id: string;
  name: string;
  priceUsd: number;
  priceVes: number | null;
  availableStock: number;
  priceExtraUsd: number;
}

export function getCatalogVariantOptions(
  product: {
    price_usd: number | null;
    price_ves: number | null;
    available_stock: number;
    default_variant_id: string;
    product_variants?: unknown;
  },
  exchangeRate?: number | null,
): CatalogVariantOption[] {
  const basePrice = product.price_usd ?? 0;
  const baseVes = product.price_ves;
  const variants = parseVariantsJson(product.product_variants);

  if (variants.length === 0) {
    return [
      {
        id: product.default_variant_id,
        name: "Estándar",
        priceUsd: basePrice,
        priceVes: computeUsdToVes(basePrice, exchangeRate) ?? baseVes,
        availableStock: product.available_stock,
        priceExtraUsd: 0,
      },
    ];
  }

  return variants.map((variant) => {
    const priceUsd = basePrice + variant.price_extra_usd;
    const priceVes =
      computeUsdToVes(priceUsd, exchangeRate) ??
      (baseVes != null && product.price_usd
        ? (priceUsd / product.price_usd) * baseVes
        : null);

    return {
      id: variant.id,
      name: variant.name,
      priceUsd,
      priceVes,
      availableStock: variant.stock,
      priceExtraUsd: variant.price_extra_usd,
    };
  });
}

export function hasMultipleVariants(product: { product_variants?: unknown }): boolean {
  return parseVariantsJson(product.product_variants).length > 0;
}

export function getTotalVariantStock(product: {
  available_stock: number;
  product_variants?: unknown;
}): number {
  const variants = parseVariantsJson(product.product_variants);
  if (variants.length === 0) return product.available_stock;
  return variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function isProductOutOfStock(product: {
  available_stock: number;
  product_variants?: unknown;
}): boolean {
  return getTotalVariantStock(product) <= 0;
}
