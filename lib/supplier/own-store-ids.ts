import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSupplierProductCategory } from "@/lib/supplier/categories";
import type { DropshipLinkedCatalogEntry } from "@/lib/dropship/linked-catalog";
import {
  isGiftCardMetadata,
  GIFT_CARD_CATEGORY_SLUG,
  GIFT_CARD_PRODUCT_SLUG,
} from "@/lib/gift-cards/catalog";

export const SUPPLIER_OWN_PRODUCT_METADATA_KEY = "supplierOwnProductId";

function metadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function isGiftCardOwnBrandRow(row: {
  metadata?: unknown;
  slug?: string | null;
  categories?: { slug?: string } | { slug?: string }[] | null;
}): boolean {
  const relation = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;
  if (isGiftCardMetadata(metadataRecord(row.metadata))) return true;
  if (row.slug === GIFT_CARD_PRODUCT_SLUG) return true;
  return relation?.slug === GIFT_CARD_CATEGORY_SLUG;
}

function ownProductIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[
    SUPPLIER_OWN_PRODUCT_METADATA_KEY
  ];
  return typeof value === "string" && value.trim() ? value : null;
}

/** IDs de productos de tienda propia. Sin procesamiento de imágenes. */
export async function listOwnBrandCatalogProductIds(
  storeId: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, metadata")
    .eq("store_id", storeId)
    .eq("is_deleted", false)
    .eq("is_active", true);

  if (error || !data) return [];

  return (data as Array<{ id: string; metadata: unknown }>)
    .filter(
      (row) =>
        ownProductIdFromMetadata(row.metadata) &&
        !isGiftCardOwnBrandRow(row),
    )
    .map((row) => row.id);
}

export async function listOwnBrandCatalogEntries(
  storeId: string,
): Promise<DropshipLinkedCatalogEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, metadata, categories(slug)")
    .eq("store_id", storeId)
    .eq("is_deleted", false)
    .eq("is_active", true);
  if (error || !data) return [];

  return (
    data as Array<{
      id: string;
      metadata: unknown;
      categories:
        | { slug?: string }
        | { slug?: string }[]
        | null;
    }>
  )
    .filter(
      (row) =>
        ownProductIdFromMetadata(row.metadata) &&
        !isGiftCardOwnBrandRow(row),
    )
    .map((row) => {
      const relation = Array.isArray(row.categories)
        ? row.categories[0]
        : row.categories;
      return {
        productId: row.id,
        supplierCategory: normalizeSupplierProductCategory(relation?.slug),
      };
    });
}

export async function listOwnBrandStoreCategories(
  storeId: string,
): Promise<Array<{ slug: string; name: string }>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("metadata, categories(slug, name)")
    .eq("store_id", storeId)
    .eq("is_deleted", false)
    .eq("is_active", true);
  if (error || !data) return [];

  const seen = new Map<string, string>();
  for (const row of data as Array<{
    metadata: unknown;
    categories:
      | { slug?: string; name?: string }
      | { slug?: string; name?: string }[]
      | null;
  }>) {
    if (!ownProductIdFromMetadata(row.metadata)) continue;
    if (isGiftCardOwnBrandRow(row)) continue;
    const relation = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories;
    const slug = relation?.slug?.trim();
    const name = relation?.name?.trim();
    if (slug && name && !seen.has(slug)) seen.set(slug, name);
  }
  return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
}
