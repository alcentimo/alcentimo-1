import type { CatalogListItem } from "@/lib/database.types";
import { roundGiftUsd } from "@/lib/gift-cards/code";

export const GIFT_CARD_METADATA_FLAG = "gift_card";
export const GIFT_CARD_CUSTOM_ATTR = "gift_card_custom";
export const GIFT_CARD_PRODUCT_SLUG = "tarjeta-de-regalo";
export const GIFT_CARD_CATEGORY_SLUG = "tarjetas-de-regalo";
export const GIFT_CARD_CATEGORY_NAME = "Tarjetas de regalo";
export const GIFT_CARD_PRESET_AMOUNTS_USD = [10, 25, 50, 100, 200] as const;
export const GIFT_CARD_CUSTOM_MIN_USD = 5;
export const GIFT_CARD_CUSTOM_MAX_USD = 500;
export const GIFT_CARD_VIRTUAL_STOCK = 999_999;
export const GIFT_CARD_AMOUNT_GROUP_ID = "gift-card-amount";
export const GIFT_CARD_RECIPIENT_GROUP_ID = "gift-card-recipient-email";
export const GIFT_CARD_FROM_GROUP_ID = "gift-card-from-name";
export const GIFT_CARD_MESSAGE_GROUP_ID = "gift-card-message";
export const GIFT_CARD_PUBLIC_IMAGE_PATH = "/images/gift-card.svg";

/** Términos que deben encontrar siempre el producto digital en el buscador. */
export const GIFT_CARD_SEARCH_PHRASES = [
  "tarjeta de regalo",
  "tarjetas de regalo",
  "tarjeta regalo",
  "tarjeta digital",
  "gift card",
  "giftcard",
  "gift-card",
  "vale de regalo",
  "codigo de regalo",
  "código de regalo",
] as const;

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

function foldGiftCardSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True si la consulta del cliente apunta a la tarjeta de regalo digital. */
export function queryMatchesGiftCardProduct(query: string): boolean {
  const folded = foldGiftCardSearchText(query);
  if (!folded) return false;
  const compact = folded.replace(/\s+/g, "");
  if (compact.includes("giftcard")) return true;
  if (folded.includes("gift") && folded.includes("card")) return true;
  if (folded.includes("tarjeta") && folded.includes("regalo")) return true;
  if (folded.includes("tarjetas") && folded.includes("regalo")) return true;
  if (folded.includes("vale") && folded.includes("regalo")) return true;
  if (folded.includes("codigo") && folded.includes("regalo")) return true;
  if (folded.includes("digital") && folded.includes("regalo")) return true;
  return GIFT_CARD_SEARCH_PHRASES.some((phrase) =>
    folded.includes(foldGiftCardSearchText(phrase)),
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

/** Detecta SKUs mayoristas que no deben copiarse a vitrinas dropship. */
export function isGiftCardSupplierListing(row: {
  title?: unknown;
  category?: unknown;
}): boolean {
  const title = String(row.title ?? "")
    .trim()
    .toLowerCase();
  const category = String(row.category ?? "")
    .trim()
    .toLowerCase();
  if (category === GIFT_CARD_CATEGORY_SLUG) return true;
  if (!title) return false;
  return (
    title.includes("tarjeta de regalo") ||
    title.includes("tarjetas de regalo") ||
    title.includes("gift card")
  );
}

export function applyGiftCardCatalogImage<T extends CatalogListItem>(
  product: T,
): T {
  if (!isGiftCardCatalogItem(product)) return product;
  const corporate = {
    id: "gift-card-corporate",
    thumb_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    medium_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    full_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    sort_order: 0,
    is_primary: true,
  };
  const currentThumb = product.thumb_url?.trim() ?? "";
  const broken =
    !currentThumb ||
    currentThumb.includes("undefined") ||
    currentThumb.endsWith("/");
  return {
    ...product,
    thumb_url: broken ? GIFT_CARD_PUBLIC_IMAGE_PATH : product.thumb_url,
    image_alt: product.image_alt?.trim() || "Tarjeta de regalo",
    gallery_images:
      product.gallery_images && product.gallery_images.length > 0 && !broken
        ? product.gallery_images
        : [corporate],
  };
}
