/**
 * Precio mayorista vs costo del proveedor.
 * El dropshipper solo debe ver precio_mayorista; costo_proveedor es interno.
 */

export const SUPPLIER_PUBLICATION_STATUSES = ["draft", "published"] as const;

export type SupplierPublicationStatus =
  (typeof SUPPLIER_PUBLICATION_STATUSES)[number];

export function normalizePublicationStatus(
  value: unknown,
): SupplierPublicationStatus {
  return value === "published" ? "published" : "draft";
}

export function roundSupplierUsd(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function parseUsdAmount(
  raw: unknown,
  options?: { min?: number; max?: number },
): number | null {
  const min = options?.min ?? 0;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  const text =
    typeof raw === "number"
      ? String(raw)
      : String(raw ?? "")
          .trim()
          .replace(",", ".");
  if (!text || text === "-" || text === "." || text === "-.") return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < min || amount > max) return null;
  return roundSupplierUsd(amount);
}

export function parsePercentAmount(
  raw: unknown,
  options?: { min?: number; max?: number },
): number | null {
  const min = options?.min ?? -99.99;
  const max = options?.max ?? 1000;
  const text =
    typeof raw === "number"
      ? String(raw)
      : String(raw ?? "")
          .trim()
          .replace(",", ".");
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < min || amount > max) return null;
  return Math.round(amount * 100) / 100;
}

export function marginUsdFromPrices(
  costoUsd: number,
  mayoristaUsd: number,
): number {
  return roundSupplierUsd(mayoristaUsd - costoUsd);
}

/** Null si el costo es 0 (el % no es representable). */
export function marginPercentFromPrices(
  costoUsd: number,
  mayoristaUsd: number,
): number | null {
  const costo = roundSupplierUsd(costoUsd);
  if (costo <= 0) return null;
  return Math.round(((mayoristaUsd - costo) / costo) * 10000) / 100;
}

export function mayoristaFromMarginUsd(
  costoUsd: number,
  marginUsd: number,
): number {
  return roundSupplierUsd(Math.max(0, costoUsd + marginUsd));
}

export function mayoristaFromMarginPercent(
  costoUsd: number,
  percent: number,
): number {
  const costo = Math.max(0, roundSupplierUsd(costoUsd));
  const pct = Number(percent) || 0;
  return roundSupplierUsd(costo * (1 + pct / 100));
}

export function formatSupplierAmountInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(roundSupplierUsd(value));
}

/** Costo interno del proveedor. No usar en DTOs de dropshipper. */
export function resolveCostoProveedorUsd(row: {
  base_price_usd?: unknown;
}): number {
  return roundSupplierUsd(Number(row.base_price_usd) || 0);
}

/** Precio visible para dropshippers. Null si el admin aún no lo definió. */
export function resolvePrecioMayoristaUsd(row: {
  precio_mayorista?: unknown;
}): number | null {
  if (row.precio_mayorista == null || row.precio_mayorista === "") {
    return null;
  }
  const amount = Number(row.precio_mayorista);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return roundSupplierUsd(amount);
}

/** Precio de venta sugerido por Alcéntimo para dropshippers. */
export function resolveSuggestedRetailUsd(row: {
  suggested_retail_usd?: unknown;
}): number | null {
  if (row.suggested_retail_usd == null || row.suggested_retail_usd === "") {
    return null;
  }
  const amount = Number(row.suggested_retail_usd);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return roundSupplierUsd(amount);
}

/** Producto listo para dropshippers: precio mayorista y venta sugerido válidos. */
export function isSupplierProductReadyForDropshippers(row: {
  precio_mayorista?: unknown;
  suggested_retail_usd?: unknown;
}): boolean {
  const mayorista = resolvePrecioMayoristaUsd(row);
  const suggested = resolveSuggestedRetailUsd(row);
  return mayorista != null && mayorista > 0 && suggested != null;
}

export function dropshipperVisibilityBlockReason(row: {
  precio_mayorista?: unknown;
  suggested_retail_usd?: unknown;
}): string | null {
  const mayorista = resolvePrecioMayoristaUsd(row);
  if (mayorista == null || mayorista <= 0) {
    return "Asigna un precio mayorista mayor a cero.";
  }
  const suggested = resolveSuggestedRetailUsd(row);
  if (suggested == null) {
    return "Asigna un precio de venta sugerido mayor a cero.";
  }
  return null;
}

export function isPublishedForDropship(row: {
  is_active?: unknown;
  catalog_visible?: unknown;
  is_visible?: unknown;
  publication_status?: unknown;
  precio_mayorista?: unknown;
  suggested_retail_usd?: unknown;
}): boolean {
  if (row.is_active === false) return false;
  if (row.catalog_visible === false) return false;
  if (row.is_visible === false) return false;
  if (normalizePublicationStatus(row.publication_status) !== "published") {
    return false;
  }
  return isSupplierProductReadyForDropshippers(row);
}

/**
 * Filtro obligatorio de listados dropshipper / catálogo público.
 * Requiere producto activo, catálogo del proveedor visible, SKU visible y publicado.
 */
export function applyDropshipVisibleProductFilter<T>(query: T): T {
  // PostgREST builders are recursively generic; loosen the chain here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let next: any = query;
  next = next.eq("is_active", true);
  next = next.eq("catalog_visible", true);
  next = next.eq("is_visible", true);
  next = next.eq("publication_status", "published");
  next = next.not("precio_mayorista", "is", null);
  next = next.gt("precio_mayorista", 0);
  next = next.not("suggested_retail_usd", "is", null);
  next = next.gt("suggested_retail_usd", 0);
  return next as T;
}

/**
 * Columnas seguras para catálogos de dropshipper / mercado.
 * Nunca incluir base_price_usd (costo_proveedor).
 */
export const DROPSHIP_SUPPLIER_PRODUCT_SELECT =
  "id, title, description, category, brand, variants, stock, precio_mayorista, suggested_retail_usd, compare_at_usd, free_shipping, image_url, created_by, created_at, is_active, publication_status, catalog_visible, is_visible";
