import type { VariantFormInput } from "@/lib/products/variants";
import {
  OPEN_STOCK_QUANTITY,
  isOpenStockVariant,
  withOpenInventoryAttributes,
} from "@/lib/inventory/open-stock";
import {
  ROPA_MODA_ATTR_COLOR,
  ROPA_MODA_ATTR_LONGITUD_CM,
  ROPA_MODA_ATTR_TALLA,
  getDefaultShoeLengthCm,
  isFashionShoeSize,
  normalizeShoeLengthCm,
  type FashionProductKind,
  type FashionShoeSizeSystem,
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

const DEFAULT_CLOTHING_SIZES = ["S", "M", "L", "XL"] as const;
const DEFAULT_SHOE_SIZES_EUR = [
  "EUR 38",
  "EUR 39",
  "EUR 40",
  "EUR 41",
  "EUR 42",
] as const;
const DEFAULT_SHOE_SIZES_US = [
  "US 7",
  "US 8",
  "US 9",
  "US 10",
  "US 11",
] as const;
const DEFAULT_COLORS = ["Negro", "Blanco"] as const;

function buildMatrix(
  sizes: readonly string[],
  colors: readonly string[],
): FashionMatrixState {
  const stocks: Record<string, string> = {};
  const priceExtras: Record<string, string> = {};
  const sizeLengthCm: Record<string, string> = {};

  for (const size of sizes) {
    if (isFashionShoeSize(size)) {
      const suggested = getDefaultShoeLengthCm(size);
      if (suggested) sizeLengthCm[size] = suggested;
    }
    for (const color of colors) {
      const key = fashionVariantKey(size, color);
      // Vacío = stock abierto (disponible sin inventario detallado).
      stocks[key] = "";
      priceExtras[key] = "0";
    }
  }

  return {
    sizes: [...sizes],
    colors: [...colors],
    stocks,
    priceExtras,
    ids: {},
    sizeLengthCm,
  };
}

export function createDefaultFashionMatrix(
  kind: FashionProductKind = "ropa",
  shoeSystem: FashionShoeSizeSystem = "eur",
): FashionMatrixState {
  if (kind === "calzado") {
    return buildMatrix(
      shoeSystem === "us" ? DEFAULT_SHOE_SIZES_US : DEFAULT_SHOE_SIZES_EUR,
      DEFAULT_COLORS,
    );
  }
  return buildMatrix(DEFAULT_CLOTHING_SIZES, DEFAULT_COLORS);
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
    stocks[key] = isOpenStockVariant(variant) ? "" : variant.stock || "0";
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
      const trimmed =
        stockRaw == null ? "" : String(stockRaw).trim();
      const priceExtra = matrix.priceExtras[key] ?? "0";

      const baseAttributes: Record<string, string> = {
        [ROPA_MODA_ATTR_TALLA]: size,
        [ROPA_MODA_ATTR_COLOR]: color,
      };
      if (lengthCm) {
        baseAttributes[ROPA_MODA_ATTR_LONGITUD_CM] = lengthCm;
      }

      // Celda vacía = combinación ofrecida con stock abierto (sin detalle).
      if (trimmed === "") {
        rows.push({
          id: matrix.ids[key],
          name: formatFashionVariantName(size, color),
          priceExtraUsd: priceExtra,
          stock: String(OPEN_STOCK_QUANTITY),
          attributes: withOpenInventoryAttributes(baseAttributes),
        });
        continue;
      }

      const stock = Math.max(0, parseInt(trimmed, 10) || 0);

      rows.push({
        id: matrix.ids[key],
        name: formatFashionVariantName(size, color),
        priceExtraUsd: priceExtra,
        stock: String(stock),
        attributes: baseAttributes,
      });
    }
  }

  return rows;
}

/** True si el dueño escribió al menos una cantidad (incluye 0). */
export function fashionMatrixHasDetailedStock(
  matrix: FashionMatrixState,
): boolean {
  for (const size of matrix.sizes) {
    for (const color of matrix.colors) {
      const raw = matrix.stocks[fashionVariantKey(size, color)];
      if (raw != null && String(raw).trim() !== "") return true;
    }
  }
  return false;
}

/** Stock y precio extra (USD) obligatorios en cada combinación talla × color. */
export function validateRequiredFashionVariants(
  variants: VariantFormInput[],
): string | null {
  if (variants.length === 0) {
    return "Añade al menos una talla y un color, con stock y precio en cada combinación.";
  }
  if (!looksLikeFashionVariants(variants)) {
    return "Completa talla y color en todas las variantes.";
  }
  for (const variant of variants) {
    if (isOpenStockVariant(variant)) {
      return `Indica el stock de «${variant.name}» (usa 0 si está agotada).`;
    }
    const stock = Number.parseInt(String(variant.stock ?? "").trim(), 10);
    if (!Number.isFinite(stock) || stock < 0) {
      return `Indica el stock de «${variant.name}».`;
    }
    const extraRaw = String(variant.priceExtraUsd ?? "").trim();
    if (!extraRaw) {
      return `Indica el precio extra en USD de «${variant.name}» (0 si usa el precio base).`;
    }
    const extra = Number(extraRaw.replace(",", "."));
    if (!Number.isFinite(extra) || extra < 0) {
      return `Indica un precio válido para «${variant.name}».`;
    }
  }
  return null;
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
