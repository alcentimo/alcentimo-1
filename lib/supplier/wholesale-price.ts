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

export function parseUsdAmount(raw: unknown): number | null {
  const text =
    typeof raw === "number"
      ? String(raw)
      : String(raw ?? "")
          .trim()
          .replace(",", ".");
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return roundSupplierUsd(amount);
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

export function isPublishedForDropship(row: {
  is_active?: unknown;
  publication_status?: unknown;
  precio_mayorista?: unknown;
}): boolean {
  if (row.is_active === false) return false;
  if (normalizePublicationStatus(row.publication_status) !== "published") {
    return false;
  }
  return resolvePrecioMayoristaUsd(row) != null;
}

/**
 * Columnas seguras para catálogos de dropshipper / mercado.
 * Nunca incluir base_price_usd (costo_proveedor).
 */
export const DROPSHIP_SUPPLIER_PRODUCT_SELECT =
  "id, title, description, category, variants, stock, precio_mayorista, compare_at_usd, free_shipping, image_url, created_by, created_at, is_active, publication_status";
