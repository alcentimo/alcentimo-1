import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPagedRows } from "@/lib/supabase/fetch-all-rows";
import {
  normalizeSupplierProductCategory,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";

export type DropshipLinkedCatalogEntry = {
  productId: string;
  supplierCategory: SupplierProductCategory;
};

type LinkedCatalogQueryOptions = {
  /** Solo productos activos del inventario público. */
  publicOnly?: boolean;
};

function chunkIds(ids: string[], size = 200): string[][] {
  if (ids.length <= size) return [ids];
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

async function lookupStoreIdBySlug(storeSlug: string): Promise<string | null> {
  const slug = storeSlug.trim().toLowerCase();
  if (!slug) return null;

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: store, error } = await (admin as any)
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.warn("[dropship-linked-store-slug]", error.message);
      return null;
    }

    return store && typeof store.id === "string" ? store.id : null;
  } catch (caught) {
    console.warn(
      "[dropship-linked-store-slug]",
      caught instanceof Error ? caught.message : caught,
    );
    return null;
  }
}

/**
 * Productos de tienda vinculados a un SKU mayorista, con la categoría del proveedor.
 * Usa admin para no depender de RLS en lecturas públicas del catálogo.
 */
export async function listDropshipLinkedCatalogEntriesForStoreId(
  storeId: string,
  options?: LinkedCatalogQueryOptions,
): Promise<DropshipLinkedCatalogEntry[]> {
  const id = storeId.trim();
  if (!id) return [];

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = admin as any;

    const linksResult = await fetchAllPagedRows((from, to) =>
      client
        .from("store_dropship_links")
        .select("product_id, supplier_product_id")
        .eq("store_id", id)
        .order("supplier_product_id", { ascending: true })
        .range(from, to),
    );

    if (linksResult.error) {
      console.warn("[dropship-linked-entries]", linksResult.error);
      return [];
    }

    const links = linksResult.rows.filter(
      (row) =>
        typeof row.product_id === "string" &&
        row.product_id &&
        typeof row.supplier_product_id === "string" &&
        row.supplier_product_id,
    );

    if (links.length === 0) return [];

    const supplierIds = [
      ...new Set(links.map((row) => row.supplier_product_id as string)),
    ];
    const categoryBySupplierId = new Map<string, SupplierProductCategory>();

    for (const chunk of chunkIds(supplierIds)) {
      const { data: supplierRows, error: supplierError } = await client
        .from("supplier_products")
        .select("id, category")
        .in("id", chunk);

      if (supplierError) {
        console.warn("[dropship-linked-supplier-category]", supplierError.message);
        continue;
      }

      for (const row of (supplierRows as Array<{
        id?: string;
        category?: unknown;
      }> | null) ?? []) {
        if (typeof row.id !== "string" || !row.id) continue;
        categoryBySupplierId.set(
          row.id,
          normalizeSupplierProductCategory(row.category),
        );
      }
    }

    let activeProductIds: Set<string> | null = null;
    if (options?.publicOnly) {
      activeProductIds = new Set();
      const productIds = [...new Set(links.map((row) => row.product_id as string))];
      for (const chunk of chunkIds(productIds)) {
        const { data: productRows, error: productError } = await client
          .from("products")
          .select("id")
          .in("id", chunk)
          .eq("is_active", true)
          .eq("is_deleted", false);

        if (productError) {
          console.warn("[dropship-linked-public-products]", productError.message);
          activeProductIds = null;
          break;
        }

        for (const row of (productRows as Array<{ id?: string }> | null) ?? []) {
          if (typeof row.id === "string" && row.id) {
            activeProductIds.add(row.id);
          }
        }
      }
    }

    const entries: DropshipLinkedCatalogEntry[] = [];
    for (const link of links) {
      const productId = link.product_id as string;
      if (activeProductIds && !activeProductIds.has(productId)) continue;
      entries.push({
        productId,
        supplierCategory: categoryBySupplierId.get(
          link.supplier_product_id as string,
        ) ?? "otros",
      });
    }

    return entries;
  } catch (caught) {
    console.warn(
      "[dropship-linked-entries]",
      caught instanceof Error ? caught.message : caught,
    );
    return [];
  }
}

export async function listDropshipLinkedCatalogEntriesForStoreSlug(
  storeSlug: string,
  options?: LinkedCatalogQueryOptions,
): Promise<DropshipLinkedCatalogEntry[]> {
  const storeId = await lookupStoreIdBySlug(storeSlug);
  if (!storeId) return [];
  return listDropshipLinkedCatalogEntriesForStoreId(storeId, options);
}

/**
 * IDs de productos de tienda vinculados a un SKU mayorista (dropshipping puro).
 */
export async function listDropshipLinkedProductIdsForStoreId(
  storeId: string,
): Promise<string[]> {
  const entries = await listDropshipLinkedCatalogEntriesForStoreId(storeId);
  return entries.map((entry) => entry.productId);
}

export async function listDropshipLinkedProductIdsForStoreSlug(
  storeSlug: string,
): Promise<string[]> {
  const entries =
    await listDropshipLinkedCatalogEntriesForStoreSlug(storeSlug);
  return entries.map((entry) => entry.productId);
}
