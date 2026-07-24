import type { CatalogListItem } from "@/lib/database.types";
import { parseVariantsJson } from "@/lib/products/variants";

/** Ajusta el stock visible de un producto según la sucursal / modo de cumplimiento. */
export function applyLocationStockToProduct(
  product: CatalogListItem,
  getAvailableStock: (variantId: string | null | undefined, fallback: number) => number,
): CatalogListItem {
  const parsedVariants = parseVariantsJson(product.product_variants);

  if (parsedVariants.length > 0) {
    const adjustedVariants = parsedVariants.map((variant) => ({
      ...variant,
      stock: getAvailableStock(variant.id, variant.stock),
    }));
    const totalAvailable = adjustedVariants.reduce(
      (sum, variant) => sum + variant.stock,
      0,
    );

    return {
      ...product,
      available_stock: totalAvailable,
      stock_quantity: totalAvailable,
      product_variants: adjustedVariants,
    };
  }

  const defaultAvailable = getAvailableStock(
    product.default_variant_id,
    product.available_stock,
  );

  return {
    ...product,
    available_stock: defaultAvailable,
    stock_quantity: defaultAvailable,
    product_variants: product.product_variants,
  };
}
