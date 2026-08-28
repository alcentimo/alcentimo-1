import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildProductMetadata, parseExtraFieldsFromMetadata } from "@/lib/products/extra-fields";

/** Propaga el nombre de la marca oficial a productos de tienda ya importados. */
export async function syncOfficialBrandNameToLinkedProducts(
  admin: SupabaseClient,
  supplierProductId: string,
  brandName: string | null,
): Promise<void> {
  const { data: links, error } = await admin
    .from("store_dropship_links")
    .select("product_id")
    .eq("supplier_product_id", supplierProductId);

  if (error) {
    console.warn("[official-brand-sync] links", error.message);
    return;
  }

  const productIds = [
    ...new Set(
      ((links as Array<{ product_id?: string }> | null) ?? [])
        .map((row) => (typeof row.product_id === "string" ? row.product_id : ""))
        .filter(Boolean),
    ),
  ];
  if (productIds.length === 0) return;

  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, metadata")
    .in("id", productIds);

  if (productsError) {
    console.warn("[official-brand-sync] products", productsError.message);
    return;
  }

  const now = new Date().toISOString();
  for (const row of (products as Array<{
    id: string;
    metadata: unknown;
  }> | null) ?? []) {
    const existing =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const extra = parseExtraFieldsFromMetadata(existing);
    const metadata = buildProductMetadata(
      existing,
      { ...extra, Marca: brandName ?? "" },
      ["Marca"],
    );

    const { error: updateError } = await admin
      .from("products")
      .update({
        brand: brandName,
        metadata,
        updated_at: now,
      })
      .eq("id", row.id);

    if (updateError) {
      console.warn("[official-brand-sync] update", updateError.message);
    }
  }
}
