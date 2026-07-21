import type { VariantFormInput } from "@/lib/products/variants";
import {
  ROPA_MODA_ATTR_COLOR,
  ROPA_MODA_ATTR_TALLA,
} from "@/lib/rubros/modules/ropa-moda/config";

export function fashionVariantKey(talla: string, color: string): string {
  return `${talla.trim().toLowerCase()}||${color.trim().toLowerCase()}`;
}

export function formatFashionVariantName(talla: string, color: string): string {
  return `${talla.trim()} / ${color.trim()}`;
}

export function parseFashionVariantName(
  name: string,
): { talla: string; color: string } | null {
  const parts = name
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  return { talla: parts[0], color: parts[1] };
}

export function getFashionAttributes(
  variant: VariantFormInput,
): { talla: string; color: string } | null {
  const fromAttrs = variant.attributes;
  const talla = fromAttrs?.[ROPA_MODA_ATTR_TALLA]?.trim();
  const color = fromAttrs?.[ROPA_MODA_ATTR_COLOR]?.trim();
  if (talla && color) return { talla, color };
  return parseFashionVariantName(variant.name);
}

export function looksLikeFashionVariants(variants: VariantFormInput[]): boolean {
  if (variants.length === 0) return false;
  return variants.every((variant) => getFashionAttributes(variant) != null);
}

export interface FashionMatrixState {
  sizes: string[];
  colors: string[];
  stocks: Record<string, string>;
  priceExtras: Record<string, string>;
  ids: Record<string, string | undefined>;
}

export function emptyFashionMatrix(): FashionMatrixState {
  return {
    sizes: [],
    colors: [],
    stocks: {},
    priceExtras: {},
    ids: {},
  };
}

export function variantsToFashionMatrix(
  variants: VariantFormInput[],
): FashionMatrixState {
  const sizes: string[] = [];
  const colors: string[] = [];
  const sizeSet = new Set<string>();
  const colorSet = new Set<string>();
  const stocks: Record<string, string> = {};
  const priceExtras: Record<string, string> = {};
  const ids: Record<string, string | undefined> = {};

  for (const variant of variants) {
    const attrs = getFashionAttributes(variant);
    if (!attrs) continue;

    if (!sizeSet.has(attrs.talla)) {
      sizeSet.add(attrs.talla);
      sizes.push(attrs.talla);
    }
    if (!colorSet.has(attrs.color)) {
      colorSet.add(attrs.color);
      colors.push(attrs.color);
    }

    const key = fashionVariantKey(attrs.talla, attrs.color);
    stocks[key] = variant.stock || "0";
    priceExtras[key] = variant.priceExtraUsd || "0";
    ids[key] = variant.id;
  }

  return { sizes, colors, stocks, priceExtras, ids };
}

export function fashionMatrixToVariants(
  matrix: FashionMatrixState,
): VariantFormInput[] {
  const rows: VariantFormInput[] = [];

  for (const size of matrix.sizes) {
    for (const color of matrix.colors) {
      const key = fashionVariantKey(size, color);
      const stockRaw = matrix.stocks[key];
      // Celda vacía = combinación no ofrecida
      if (stockRaw == null || String(stockRaw).trim() === "") continue;

      const stock = Math.max(0, parseInt(String(stockRaw), 10) || 0);
      const priceExtra = matrix.priceExtras[key] ?? "0";

      rows.push({
        id: matrix.ids[key],
        name: formatFashionVariantName(size, color),
        priceExtraUsd: priceExtra,
        stock: String(stock),
        attributes: {
          [ROPA_MODA_ATTR_TALLA]: size,
          [ROPA_MODA_ATTR_COLOR]: color,
        },
      });
    }
  }

  return rows;
}
