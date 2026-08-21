import { computeUsdToVes } from "@/lib/catalog/pricing";
import { parseStationeryMetadata } from "@/lib/rubros/modules/papeleria-libreria-oficina/config";
import {
  areStationerySaleVariants,
  resolveStationeryUnitsPerSale,
  resolveStationeryVariantAvailableStock,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/variants";

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

/**
 * ID estable cuando falta `id` en JSON. Nunca usar randomUUID aquí: se reparsea
 * en cada render y rompería las claves del carrito (líneas duplicadas).
 */
function stableVariantFallbackId(
  name: string,
  index: number,
  attributes?: Record<string, string>,
): string {
  const attrPart = attributes
    ? Object.entries(attributes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&")
    : "";
  const raw = `${index}:${name}:${attrPart}`
    .toLowerCase()
    .replace(/[^a-z0-9:=&_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return `auto-${raw || String(index)}`;
}

export function parseVariantsJson(raw: unknown): ProductVariantJson[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => {
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const attributes = parseAttributes(item.attributes);
      const rawId = typeof item.id === "string" ? item.id.trim() : "";
      return {
        id: rawId || stableVariantFallbackId(name, index, attributes),
        name,
        price_extra_usd:
          typeof item.price_extra_usd === "number" && Number.isFinite(item.price_extra_usd)
            ? item.price_extra_usd
            : parseFloat(String(item.price_extra_usd ?? 0)) || 0,
        stock:
          typeof item.stock === "number" && Number.isFinite(item.stock)
            ? Math.max(0, Math.floor(item.stock))
            : Math.max(0, parseInt(String(item.stock ?? 0), 10) || 0),
        attributes,
      };
    })
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
  wholesalePriceUsd: number | null;
  wholesaleMinQty: number | null;
}

export function getCatalogVariantOptions(
  product: {
    price_usd: number | null;
    price_ves: number | null;
    available_stock: number;
    default_variant_id: string;
    product_variants?: unknown;
    metadata?: Record<string, unknown> | null;
    wholesale_price_usd?: number | null;
    wholesale_min_qty?: number | null;
  },
  exchangeRate?: number | null,
): CatalogVariantOption[] {
  const basePrice = product.price_usd ?? 0;
  const baseVes = product.price_ves;
  const wholesalePriceUsd = product.wholesale_price_usd ?? null;
  const wholesaleMinQty = product.wholesale_min_qty ?? null;
  const variants = parseVariantsJson(product.product_variants);
  const metadata = product.metadata ?? null;
  const usesUnifiedStock =
    parseStationeryMetadata(metadata)?.unified_stock === true &&
    areStationerySaleVariants(variants);

  if (variants.length === 0) {
    const fallbackId =
      typeof product.default_variant_id === "string" &&
      product.default_variant_id.trim().length > 0
        ? product.default_variant_id.trim()
        : "";
    return [
      {
        id: fallbackId,
        name: "Estándar",
        priceUsd: basePrice,
        priceVes: computeUsdToVes(basePrice, exchangeRate) ?? baseVes,
        availableStock: product.available_stock,
        priceExtraUsd: 0,
        wholesalePriceUsd,
        wholesaleMinQty,
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
    const unitsPerSale = resolveStationeryUnitsPerSale(variant, metadata);
    const availableStock = usesUnifiedStock
      ? resolveStationeryVariantAvailableStock(
          product.available_stock,
          unitsPerSale,
        )
      : variant.stock;

    return {
      id: variant.id,
      name: variant.name,
      priceUsd,
      priceVes,
      availableStock,
      priceExtraUsd: variant.price_extra_usd,
      wholesalePriceUsd,
      wholesaleMinQty,
    };
  });
}

export function hasMultipleVariants(product: { product_variants?: unknown }): boolean {
  return parseVariantsJson(product.product_variants).length > 0;
}

export function getTotalVariantStock(product: {
  available_stock: number;
  stock_quantity?: number;
  product_variants?: unknown;
  metadata?: Record<string, unknown> | null;
}): number {
  const catalogStock = Math.max(
    product.available_stock,
    product.stock_quantity ?? 0,
  );
  const variants = parseVariantsJson(product.product_variants);
  if (
    parseStationeryMetadata(product.metadata)?.unified_stock &&
    areStationerySaleVariants(variants)
  ) {
    return catalogStock;
  }
  if (variants.length === 0) return catalogStock;
  const variantTotal = variants.reduce((sum, variant) => sum + variant.stock, 0);
  return Math.max(variantTotal, catalogStock);
}

export function isProductOutOfStock(product: {
  available_stock: number;
  product_variants?: unknown;
  metadata?: Record<string, unknown> | null;
}): boolean {
  return getTotalVariantStock(product) <= 0;
}
