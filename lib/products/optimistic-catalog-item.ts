import type { CatalogListItem, Store } from "@/lib/database.types";

export const OPTIMISTIC_PRODUCT_ID_PREFIX = "optimistic-";

export function isOptimisticProductId(productId: string): boolean {
  return productId.startsWith(OPTIMISTIC_PRODUCT_ID_PREFIX);
}

export function createOptimisticProductId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${OPTIMISTIC_PRODUCT_ID_PREFIX}${crypto.randomUUID()}`;
  }
  return `${OPTIMISTIC_PRODUCT_ID_PREFIX}${Date.now()}`;
}

export interface OptimisticProductDraft {
  tempId: string;
  productName: string;
  priceUsd: number;
  stockQuantity: number;
  /** Object URL owned by the catalog panel until reconcile/revoke. */
  thumbPreviewUrl: string | null;
  categoryName?: string;
}

export function buildOptimisticCatalogItem(
  store: Pick<Store, "id" | "slug" | "name">,
  draft: OptimisticProductDraft,
): CatalogListItem {
  const now = new Date().toISOString();
  const stock = Math.max(0, Math.floor(draft.stockQuantity));

  return {
    store_id: store.id,
    store_slug: store.slug,
    store_name: store.name,
    product_id: draft.tempId,
    product_slug: draft.tempId,
    product_name: draft.productName,
    short_description: null,
    brand: null,
    is_featured: false,
    sort_order: -1,
    created_at: now,
    updated_at: now,
    category_id: "",
    category_name: draft.categoryName ?? "",
    category_slug: "",
    category_path: "",
    default_variant_id: "",
    default_sku: "",
    stock_quantity: stock,
    reserved_quantity: 0,
    available_stock: stock,
    low_stock_threshold: 5,
    default_attributes: {},
    price_usd: draft.priceUsd,
    price_ves: null,
    compare_at_usd: null,
    compare_at_ves: null,
    wholesale_price_usd: null,
    wholesale_min_qty: null,
    exchange_rate_used: null,
    product_variants: null,
    metadata: { optimisticUploading: true },
    thumb_url: draft.thumbPreviewUrl,
    blur_hash: null,
    image_alt: draft.productName,
    gallery_images: null,
  };
}

export function isCatalogItemUploading(product: CatalogListItem): boolean {
  return (
    isOptimisticProductId(product.product_id) ||
    product.metadata?.optimisticUploading === true
  );
}
