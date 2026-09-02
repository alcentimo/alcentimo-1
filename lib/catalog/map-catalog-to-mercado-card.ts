import { resolveCatalogProductBrand } from "@/lib/catalog/product-brand";
import type { CatalogListItem } from "@/lib/database.types";
import { applyGiftCardCatalogImage } from "@/lib/gift-cards/catalog";
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
  const item = applyGiftCardCatalogImage(product);
  const priceUsd = Number(item.price_usd) || 0;
  const compareAtUsd =
    item.compare_at_usd != null && Number.isFinite(item.compare_at_usd)
      ? Number(item.compare_at_usd)
      : null;

  const galleryUrls = [
    ...new Set(
      (item.gallery_images ?? [])
        .map((image) => image.thumb_url?.trim())
        .filter((url): url is string => Boolean(url)),
    ),
  ];
  if (galleryUrls.length === 0 && item.thumb_url) {
    galleryUrls.push(item.thumb_url);
  }

  const brand = resolveCatalogProductBrand(item);

  return {
    product_id: item.product_id,
    product_slug: item.product_slug,
    product_name: item.product_name,
    short_description: item.short_description,
    price_usd: priceUsd,
    compare_at_usd: compareAtUsd,
    discount_percent: computeDiscountPercent(priceUsd, compareAtUsd),
    free_shipping: false,
    thumb_url: galleryUrls[0] ?? item.thumb_url,
    category: normalizeSupplierProductCategory(item.category_slug),
    category_name: item.category_name || "Catálogo",
    available_stock: item.available_stock,
    created_at: item.created_at,
    seller_user_id: item.store_id,
    store_name: storeName,
    brand,
    supplier_label: brand || storeName,
    variants: emptySupplierVariants(),
    gallery_urls: galleryUrls,
  };
}
