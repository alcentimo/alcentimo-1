import type { VariantFormInput } from "@/lib/products/variants";
import {
  ROPA_MODA_ATTR_COLOR,
  ROPA_MODA_ATTR_LONGITUD_CM,
  ROPA_MODA_ATTR_TALLA,
  getDefaultShoeLengthCm,
  isFashionShoeSize,
  normalizeShoeLengthCm,
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
): { talla: string; color: string; longitudCm: string | null } | null {
  const fromAttrs = variant.attributes;
  const talla = fromAttrs?.[ROPA_MODA_ATTR_TALLA]?.trim();
  const color = fromAttrs?.[ROPA_MODA_ATTR_COLOR]?.trim();
  const longitudCm = normalizeShoeLengthCm(
    fromAttrs?.[ROPA_MODA_ATTR_LONGITUD_CM],
  );
  if (talla && color) return { talla, color, longitudCm };
  const parsed = parseFashionVariantName(variant.name);
  if (!parsed) return null;
  return { ...parsed, longitudCm };
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
  /** Longitud en cm por talla de calzado (clave = etiqueta de talla). */
  sizeLengthCm: Record<string, string>;
}

export function emptyFashionMatrix(): FashionMatrixState {
  return {
    sizes: [],
    colors: [],
    stocks: {},
    priceExtras: {},
    ids: {},
    sizeLengthCm: {},
  };
}

export function createDefaultFashionMatrix(): FashionMatrixState {
  const sizes = ["S", "M", "L", "XL"];
  const colors = ["Negro", "Blanco"];
  const stocks: Record<string, string> = {};
  const priceExtras: Record<string, string> = {};

  for (const size of sizes) {
    for (const color of colors) {
      const key = fashionVariantKey(size, color);
      stocks[key] = "0";
      priceExtras[key] = "0";
    }
  }

  return { sizes, colors, stocks, priceExtras, ids: {}, sizeLengthCm: {} };
}

function sizeKey(size: string): string {
  return size.trim().toLowerCase();
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
  const sizeLengthCm: Record<string, string> = {};

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

    if (attrs.longitudCm && !sizeLengthCm[attrs.talla]) {
      sizeLengthCm[attrs.talla] = attrs.longitudCm;
    }
  }

  // Completar cm sugeridos para tallas de calzado sin valor guardado.
  for (const size of sizes) {
    if (!isFashionShoeSize(size)) continue;
    if (sizeLengthCm[size]?.trim()) continue;
    const suggested = getDefaultShoeLengthCm(size);
    if (suggested) sizeLengthCm[size] = suggested;
  }

  return { sizes, colors, stocks, priceExtras, ids, sizeLengthCm };
}

export function fashionMatrixToVariants(
  matrix: FashionMatrixState,
): VariantFormInput[] {
  const rows: VariantFormInput[] = [];

  for (const size of matrix.sizes) {
    const lengthCm = isFashionShoeSize(size)
      ? normalizeShoeLengthCm(
          matrix.sizeLengthCm[size] ?? getDefaultShoeLengthCm(size),
        )
      : null;

    for (const color of matrix.colors) {
      const key = fashionVariantKey(size, color);
      const stockRaw = matrix.stocks[key];
      // Celda vacía = combinación no ofrecida
      if (stockRaw == null || String(stockRaw).trim() === "") continue;

      const stock = Math.max(0, parseInt(String(stockRaw), 10) || 0);
      const priceExtra = matrix.priceExtras[key] ?? "0";

      const attributes: Record<string, string> = {
        [ROPA_MODA_ATTR_TALLA]: size,
        [ROPA_MODA_ATTR_COLOR]: color,
      };
      if (lengthCm) {
        attributes[ROPA_MODA_ATTR_LONGITUD_CM] = lengthCm;
      }

      rows.push({
        id: matrix.ids[key],
        name: formatFashionVariantName(size, color),
        priceExtraUsd: priceExtra,
        stock: String(stock),
        attributes,
      });
    }
  }

  return rows;
}

/** Conserva cm solo de tallas de calzado activas (sin re-normalizar al editar). */
export function pruneFashionSizeLengthCm(
  matrix: FashionMatrixState,
): Record<string, string> {
  const next: Record<string, string> = {};
  const active = new Set(
    matrix.sizes.filter((size) => isFashionShoeSize(size)).map(sizeKey),
  );
  for (const [size, cm] of Object.entries(matrix.sizeLengthCm ?? {})) {
    if (!active.has(sizeKey(size))) continue;
    if (!String(cm ?? "").trim()) continue;
    next[size] = String(cm).trim();
  }
  return next;
}
