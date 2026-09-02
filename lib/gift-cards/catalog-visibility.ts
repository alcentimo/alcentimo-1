import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdminOwnedStore } from "@/lib/gift-cards/admin-store";
import {
  GIFT_CARD_CATEGORY_NAME,
  GIFT_CARD_CATEGORY_SLUG,
  GIFT_CARD_PRODUCT_SLUG,
  isGiftCardCatalogItem,
  isGiftCardMetadata,
} from "@/lib/gift-cards/catalog";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";

export function filterGiftCardsForPublicCatalog<T>(
  items: T[],
  adminOwned: boolean,
  pick: (item: T) => Parameters<typeof isGiftCardCatalogItem>[0],
): T[] {
  if (adminOwned) return items;
  return items.filter((item) => !isGiftCardCatalogItem(pick(item)));
}

export function excludeGiftCardCategoryOptions(
  categories: CatalogCategoryOption[],
  adminOwned: boolean,
): CatalogCategoryOption[] {
  const withoutGift = categories.filter(
    (category) => category.slug !== GIFT_CARD_CATEGORY_SLUG,
  );
  if (!adminOwned) return withoutGift;
  return [
    ...withoutGift,
    {
      slug: GIFT_CARD_CATEGORY_SLUG,
      name: GIFT_CARD_CATEGORY_NAME,
      sortOrder: withoutGift.length,
    },
  ];
}

function rowLooksLikeGiftCard(row: {
  slug?: string | null;
  metadata?: unknown;
  categories?: { slug?: string } | { slug?: string }[] | null;
}): boolean {
  const relation = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;
  return isGiftCardCatalogItem({
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    product_slug: row.slug ?? "",
    category_slug: relation?.slug ?? "",
  });
}

/** IDs del producto digital de gift card, solo en la vitrina del admin. */
export async function listAdminGiftCardCatalogProductIds(
  storeId: string,
  ownerId?: string | null,
): Promise<string[]> {
  const id = storeId.trim();
  if (!id) return [];

  const adminOwned = await isPlatformAdminOwnedStore(id, ownerId);
  if (!adminOwned) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, slug, metadata, categories(slug)")
    .eq("store_id", id)
    .eq("is_deleted", false)
    .eq("is_active", true);

  if (error || !data) return [];

  return (
    data as Array<{
      id: string;
      slug?: string | null;
      metadata?: unknown;
      categories: { slug?: string } | { slug?: string }[] | null;
    }>
  )
    .filter((row) => rowLooksLikeGiftCard(row) || isGiftCardMetadata(
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    ) || row.slug === GIFT_CARD_PRODUCT_SLUG)
    .map((row) => row.id);
}

export function stripGiftCardsFromCatalogItems(
  products: CatalogListItem[],
  adminOwned: boolean,
): CatalogListItem[] {
  return filterGiftCardsForPublicCatalog(products, adminOwned, (item) => item);
}
