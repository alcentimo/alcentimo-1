import type { CatalogListItem } from "@/lib/database.types";

/** Ajusta el stock visible de un producto según la sucursal / modo de cumplimiento. */
export function applyLocationStockToProduct(
  product: CatalogListItem,
  getAvailableStock: (variantId: string | null | undefined, fallback: number) => number,
): CatalogListItem {
  const defaultAvailable = getAvailableStock(
    product.default_variant_id,
    product.available_stock,
  );

  const variants = product.product_variants?.map((variant) => ({
    ...variant,
    stock: getAvailableStock(variant.id, variant.stock),
  }));

  return {
    ...product,
    available_stock: defaultAvailable,
    stock_quantity: defaultAvailable,
    product_variants: variants ?? product.product_variants,
  };
}
