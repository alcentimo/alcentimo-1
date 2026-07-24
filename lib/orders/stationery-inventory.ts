import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderLineItem } from "@/lib/orders/types";
import { parseVariantsJson } from "@/lib/products/variants";
import {
  resolveStationeryOrderStockUnits,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/variants";
import { parseStationeryMetadata } from "@/lib/rubros/modules/papeleria-libreria-oficina/config";

export async function enrichOrderItemsWithStockUnits(
  admin: SupabaseClient,
  storeId: string,
  items: OrderLineItem[],
): Promise<OrderLineItem[]> {
  if (items.length === 0) return items;

  const variantIds = [...new Set(items.map((item) => item.variant_id))];
  const { data: variantRows, error } = await admin
    .from("product_variants")
    .select("id, product_id, is_default")
    .in("id", variantIds);

  if (error || !variantRows?.length) return items;

  const productIds = [
    ...new Set(variantRows.map((row) => row.product_id as string)),
  ];

  const [{ data: products, error: productsError }, { data: defaultVariants }] =
    await Promise.all([
      admin
        .from("products")
        .select("id, metadata, variants, store_id")
        .in("id", productIds)
        .eq("store_id", storeId),
      admin
        .from("product_variants")
        .select("id, product_id")
        .in("product_id", productIds)
        .eq("is_default", true),
    ]);

  if (productsError || !products?.length) return items;

  const productById = new Map(
    products.map((product) => [product.id as string, product]),
  );
  const defaultVariantByProductId = new Map(
    (defaultVariants ?? []).map((row) => [row.product_id as string, row.id as string]),
  );

  return items.map((item) => {
    const variantRow = variantRows.find((row) => row.id === item.variant_id);
    if (!variantRow) return item;

    const product = productById.get(variantRow.product_id as string);
    if (!product) return item;

    const metadata =
      product.metadata && typeof product.metadata === "object"
        ? (product.metadata as Record<string, unknown>)
        : null;
    const stationery = parseStationeryMetadata(metadata);
    if (!stationery?.unified_stock) return item;

    const parsedVariants = parseVariantsJson(product.variants);
    const variant =
      parsedVariants.find((row) => row.id === item.variant_id) ?? null;
    const stockUnits = resolveStationeryOrderStockUnits(
      item.quantity,
      variant,
      metadata,
    );

    const inventoryVariantId =
      defaultVariantByProductId.get(product.id as string) ?? item.variant_id;

    if (stockUnits === item.quantity && inventoryVariantId === item.variant_id) {
      return item;
    }

    return {
      ...item,
      stock_units: stockUnits,
      inventory_variant_id: inventoryVariantId,
    };
  });
}
