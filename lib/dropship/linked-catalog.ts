import { createAdminClient } from "@/lib/supabase/admin";

/**
 * IDs de productos de tienda vinculados a un SKU mayorista (dropshipping puro).
 * Usa admin para no depender de RLS en lecturas públicas del catálogo.
 */
export async function listDropshipLinkedProductIdsForStoreId(
  storeId: string,
): Promise<string[]> {
  const id = storeId.trim();
  if (!id) return [];

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("store_dropship_links")
      .select("product_id")
      .eq("store_id", id);

    if (error) {
      console.warn("[dropship-linked-ids]", error.message);
      return [];
    }

    const ids: string[] = [];
    for (const row of (data as { product_id?: string }[] | null) ?? []) {
      if (typeof row.product_id === "string" && row.product_id) {
        ids.push(row.product_id);
      }
    }
    return ids;
  } catch (caught) {
    console.warn(
      "[dropship-linked-ids]",
      caught instanceof Error ? caught.message : caught,
    );
    return [];
  }
}

export async function listDropshipLinkedProductIdsForStoreSlug(
  storeSlug: string,
): Promise<string[]> {
  const slug = storeSlug.trim().toLowerCase();
  if (!slug) return [];

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: store, error: storeError } = await (admin as any)
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (storeError) {
      console.warn("[dropship-linked-ids-slug]", storeError.message);
      return [];
    }

    const storeId =
      store && typeof store.id === "string" ? store.id : null;
    if (!storeId) return [];

    return listDropshipLinkedProductIdsForStoreId(storeId);
  } catch (caught) {
    console.warn(
      "[dropship-linked-ids-slug]",
      caught instanceof Error ? caught.message : caught,
    );
    return [];
  }
}
