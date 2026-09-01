import { getStoreProductDeepLinkPath } from "@/lib/store-host";
import { GIFT_CARD_PRODUCT_SLUG } from "@/lib/gift-cards/catalog";

export function getGiftCardStorefrontPath(
  storeSlug: string,
  pathname?: string | null,
): string {
  return getStoreProductDeepLinkPath(storeSlug, GIFT_CARD_PRODUCT_SLUG, {
    pathname,
  });
}

export function isGiftCardStorefrontPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  return pathname.toLowerCase().includes(
    `/producto/${GIFT_CARD_PRODUCT_SLUG}`,
  );
}
