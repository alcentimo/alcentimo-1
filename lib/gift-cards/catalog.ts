import type { CatalogListItem } from "@/lib/database.types";
import { roundGiftUsd } from "@/lib/gift-cards/code";

export const GIFT_CARD_METADATA_FLAG = "gift_card";
export const GIFT_CARD_CUSTOM_ATTR = "gift_card_custom";
export const GIFT_CARD_PRODUCT_SLUG = "tarjeta-de-regalo";
export const GIFT_CARD_CATEGORY_SLUG = "tarjetas-de-regalo";
export const GIFT_CARD_PRESET_AMOUNTS_USD = [10, 25, 50, 100, 200] as const;
export const GIFT_CARD_CUSTOM_MIN_USD = 5;
export const GIFT_CARD_CUSTOM_MAX_USD = 500;
export const GIFT_CARD_VIRTUAL_STOCK = 999_999;
export const GIFT_CARD_AMOUNT_GROUP_ID = "gift-card-amount";

export function isGiftCardMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.[GIFT_CARD_METADATA_FLAG] === true;
}

export function isGiftCardCatalogItem(
  product:
    | Pick<CatalogListItem, "metadata" | "category_slug" | "product_slug">
    | null
    | undefined,
): boolean {
  if (!product) return false;
  if (isGiftCardMetadata(product.metadata ?? null)) return true;
  return (
    product.product_slug === GIFT_CARD_PRODUCT_SLUG ||
    product.category_slug === GIFT_CARD_CATEGORY_SLUG
  );
}

export function clampGiftCardCustomAmount(value: number): number | null {
  const amount = roundGiftUsd(value);
  if (!Number.isFinite(amount)) return null;
  if (amount < GIFT_CARD_CUSTOM_MIN_USD || amount > GIFT_CARD_CUSTOM_MAX_USD) {
    return null;
  }
  return amount;
}

export function isGiftCardCustomVariant(attributes: unknown): boolean {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return false;
  }
  const value = (attributes as Record<string, unknown>)[GIFT_CARD_CUSTOM_ATTR];
  return value === true || value === "true" || value === "1";
}

export function cartItemsAreGiftCardsOnly(
  items: Array<{ product?: Parameters<typeof isGiftCardCatalogItem>[0] }>,
): boolean {
  if (items.length === 0) return false;
  return items.every((item) => isGiftCardCatalogItem(item.product));
}

export function giftCardWholesaleEnabled(
  product: Parameters<typeof isGiftCardCatalogItem>[0],
  wholesaleEnabled: boolean,
): boolean {
  if (isGiftCardCatalogItem(product)) return false;
  return wholesaleEnabled;
}
