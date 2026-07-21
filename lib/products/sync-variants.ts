import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";
import type { ProductVariantJson } from "@/lib/products/variants";

async function upsertVariantPrice(
  supabase: SupabaseClient,
  variantId: string,
  amountUsd: number,
): Promise<{ error?: string }> {
  const { data: existingPrice, error: priceLookupError } = await supabase
    .from("product_prices")
    .select("id")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (priceLookupError) return { error: priceLookupError.message };

  const { error } = existingPrice
    ? await supabase
        .from("product_prices")
        .update({ amount_usd: amountUsd })
        .eq("variant_id", variantId)
    : await supabase.from("product_prices").insert({
        variant_id: variantId,
        amount_usd: amountUsd,
      });

  if (error) return { error: error.message };
  return {};
}

export async function syncProductVariants(
  supabase: SupabaseClient,
  options: {
    productId: string;
    storeSlug: string;
    productSlug: string;
    basePriceUsd: number;
    lowStockThreshold: number;
    variants: ProductVariantJson[];
    defaultVariantId: string;
  },
): Promise<{ error?: string; synced: ProductVariantJson[] }> {
  const {
    productId,
    storeSlug,
    productSlug,
    basePriceUsd,
    lowStockThreshold,
    variants,
    defaultVariantId,
  } = options;

  if (variants.length === 0) {
    const { error } = await supabase
      .from("products")
      .update({ variants: [] })
      .eq("id", productId);

    if (error) return { error: error.message, synced: [] };
    return { synced: [] };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  if (existingError) return { error: existingError.message, synced: [] };

  const existingIds = new Set((existingRows ?? []).map((row) => row.id as string));
  const keepIds = new Set<string>([defaultVariantId]);
  const synced: ProductVariantJson[] = [];

  await supabase
    .from("product_variants")
    .update({
      stock_quantity: 0,
      is_default: true,
      name: "Base",
      low_stock_threshold: lowStockThreshold,
    })
    .eq("id", defaultVariantId);

  await upsertVariantPrice(supabase, defaultVariantId, basePriceUsd);

  for (let index = 0; index < variants.length; index++) {
    const variant = variants[index];
    let variantId = variant.id;

    if (!existingIds.has(variantId)) {
      const sku = `${storeSlug}-${productSlug}-${slugify(variant.name) || index + 1}`.slice(
        0,
        80,
      );
      const { data: inserted, error: insertError } = await supabase
        .from("product_variants")
        .insert({
          product_id: productId,
          sku,
          name: variant.name,
          stock_quantity: variant.stock,
          low_stock_threshold: lowStockThreshold,
          is_default: false,
          is_active: true,
        })
        .select("id")
        .single();

      if (insertError) return { error: insertError.message, synced: [] };
      variantId = inserted.id as string;
    } else {
      const { error: updateError } = await supabase
        .from("product_variants")
        .update({
          name: variant.name,
          stock_quantity: variant.stock,
          low_stock_threshold: lowStockThreshold,
          is_default: false,
          is_active: true,
        })
        .eq("id", variantId)
        .eq("product_id", productId);

      if (updateError) return { error: updateError.message, synced: [] };
    }

    const priceResult = await upsertVariantPrice(
      supabase,
      variantId,
      basePriceUsd + variant.price_extra_usd,
    );
    if (priceResult.error) return { error: priceResult.error, synced: [] };

    keepIds.add(variantId);
    synced.push({
      id: variantId,
      name: variant.name,
      price_extra_usd: variant.price_extra_usd,
      stock: variant.stock,
      attributes: variant.attributes,
    });
  }

  for (const row of existingRows ?? []) {
    const id = row.id as string;
    if (!keepIds.has(id)) {
      await supabase
        .from("product_variants")
        .update({ is_active: false, is_default: false })
        .eq("id", id);
    }
  }

  const { error: productError } = await supabase
    .from("products")
    .update({ variants: synced })
    .eq("id", productId);

  if (productError) return { error: productError.message, synced: [] };

  return { synced };
}
