import {
  PRODUCT_IMPORT_LIMITS,
  type ProductImportColumn,
} from "@/lib/products/import-schema";

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Elimina caracteres de control y recorta espacios. */
export function sanitizeImportText(
  value: unknown,
  maxLength: number,
): string {
  if (value == null) return "";
  const text = String(value).replace(CONTROL_CHARS, "").trim();
  return text.slice(0, maxLength);
}

export function normalizeHeaderKey(value: unknown): string {
  return sanitizeImportText(value, 80)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export function parseImportPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  const raw = sanitizeImportText(value, 32);
  if (!raw) return null;

  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function parseImportStock(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  const raw = sanitizeImportText(value, 16);
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function sanitizeImportImageUrl(value: unknown): string | null {
  const raw = sanitizeImportText(value, PRODUCT_IMPORT_LIMITS.url_imagen);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString().slice(0, PRODUCT_IMPORT_LIMITS.url_imagen);
  } catch {
    return null;
  }
}

export function mapHeaders(
  headerRow: unknown[],
): Partial<Record<ProductImportColumn, number>> {
  const map: Partial<Record<ProductImportColumn, number>> = {};

  headerRow.forEach((cell, index) => {
    const key = normalizeHeaderKey(cell);
    if (
      key === "nombre" ||
      key === "descripcion" ||
      key === "precio" ||
      key === "stock" ||
      key === "url_imagen" ||
      key === "categoria"
    ) {
      map[key] = index;
    }
  });

  return map;
}

export function normalizeProductNameKey(name: string): string {
  return name.trim().toLocaleLowerCase("es");
}

/** Minúsculas y espacios extra colapsados para categorías de importación. */
export function normalizeImportCategoryName(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

