import { isSupportAdmin } from "@/lib/support/is-support-admin";
import {
  resolveCostoProveedorUsd,
  resolvePrecioMayoristaUsd,
} from "@/lib/supplier/wholesale-price";

/** El admin opera la tienda propia con el costo de fábrica, no solo el mayorista. */
export function hasSupplierCostPricePrivilege(
  email: string | null | undefined,
): boolean {
  return isSupportAdmin(email);
}

export const ADMIN_SUPPLIER_PRODUCT_SELECT =
  "id, title, description, category, brand, variants, stock, base_price_usd, precio_mayorista, suggested_retail_usd, compare_at_usd, free_shipping, image_url, created_by, created_at, is_active, publication_status, catalog_visible, is_visible";

export function resolveMerchantCatalogCostUsd(
  row: {
    base_price_usd?: unknown;
    precio_mayorista?: unknown;
  },
  privileged: boolean,
): {
  wholesalePriceUsd: number | null;
  costoProveedorUsd: number;
  precioMayoristaUsd: number | null;
  usesSupplierCostPrice: boolean;
} {
  const precioMayoristaUsd = resolvePrecioMayoristaUsd(row);
  const costoProveedorUsd = resolveCostoProveedorUsd(row);
  const usesSupplierCostPrice = privileged && costoProveedorUsd > 0;
  return {
    precioMayoristaUsd,
    costoProveedorUsd,
    usesSupplierCostPrice,
    wholesalePriceUsd: usesSupplierCostPrice
      ? costoProveedorUsd
      : precioMayoristaUsd,
  };
}
