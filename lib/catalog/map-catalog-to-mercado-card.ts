import type { CatalogListItem } from "@/lib/database.types";
import {
  computeDiscountPercent,
  type MercadoProductCard,
} from "@/lib/mercado-oculto/types";
import { normalizeSupplierProductCategory } from "@/lib/supplier/categories";
import { emptySupplierVariants } from "@/lib/supplier/variants";

/**
 * Adapta un ítem del catálogo público al shape de tarjeta Mercado Oculto.
 */
export function mapCatalogListItemToMercadoCard(
  product: CatalogListItem,
  storeName: string,
): MercadoProductCard {
  const priceUsd = Number(product.price_usd) || 0;
  const compareAtUsd =
    product.compare_at_usd != null && Number.isFinite(product.compare_at_usd)
      ? Number(product.compare_at_usd)
      : null;

  return {
    product_id: product.product_id,
    product_name: product.product_name,
    short_description: product.short_description,
    price_usd: priceUsd,
    compare_at_usd: compareAtUsd,
    discount_percent: computeDiscountPercent(priceUsd, compareAtUsd),
    free_shipping: false,
    thumb_url: product.thumb_url,
    category: normalizeSupplierProductCategory(product.category_slug),
    category_name: product.category_name || "Catálogo",
    available_stock: product.available_stock,
    created_at: product.created_at,
    seller_user_id: product.store_id,
    store_name: storeName,
    supplier_label:
      product.brand?.trim() ||
      product.category_name?.trim() ||
      storeName,
    variants: emptySupplierVariants(),
  };
}
