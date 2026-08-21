import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import {
  normalizeDropshipPricingSettings,
  suggestRetailFromWholesaleCost,
  type DropshipPricingSettings,
} from "@/lib/dropship/margin";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";

/**
 * Registra el cambio de precio mayorista, alerta a comerciantes vinculados
 * y opcionalmente recalcula el precio de venta según su regla de margen.
 * Las órdenes ya emitidas NO se tocan (snapshot inmutable).
 */
export async function recordSupplierPriceChangeAndNotify(input: {
  admin: SupabaseClient;
  supplierProductId: string;
  productTitle: string;
  oldPriceUsd: number;
  newPriceUsd: number;
  changedBy: string | null;
  note?: string;
  notifyMerchants?: boolean;
}): Promise<void> {
  const {
    admin,
    supplierProductId,
    productTitle,
    oldPriceUsd,
    newPriceUsd,
    changedBy,
    note = "Actualización de precio mayorista.",
    notifyMerchants = true,
  } = input;

  const oldRounded = Math.round(oldPriceUsd * 100) / 100;
  const newRounded = Math.round(newPriceUsd * 100) / 100;
  if (oldRounded === newRounded) return;

  await admin.from("supplier_product_price_history").insert({
    supplier_product_id: supplierProductId,
    old_price_usd: oldRounded,
    new_price_usd: newRounded,
    changed_by: changedBy,
    note,
  });

  if (!notifyMerchants) return;

  const { data: links } = await admin
    .from("store_dropship_links")
    .select("id, store_id, product_id, auto_reprice, last_cost_usd")
    .eq("supplier_product_id", supplierProductId);

  if (!links || links.length === 0) return;

  const linkedStoreIds = new Set<string>();

  for (const link of links) {
    const storeId = String(link.store_id);
    linkedStoreIds.add(storeId);
    const productId =
      typeof link.product_id === "string" && link.product_id
        ? link.product_id
        : null;

    const settings = await getStoreSettingsConfig(storeId);
    const dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);
    const suggested = suggestRetailFromWholesaleCost(newRounded, dropship);

    let previousRetail: number | null = null;
    if (productId) {
      previousRetail = await getCurrentRetailUsd(admin, productId);
    }

    const shouldAutoApply =
      (Boolean(link.auto_reprice) || dropship.autoApplyOnCostChange) &&
      dropship.enabled &&
      suggested != null &&
      productId;

    let appliedRetail: number | null = null;
    if (shouldAutoApply && productId && suggested != null) {
      const applied = await applyRetailPriceToProduct(
        admin,
        productId,
        suggested,
      );
      if (applied.ok) appliedRetail = suggested;
    }

    await admin.from("supplier_price_change_alerts").insert({
      store_id: storeId,
      supplier_product_id: supplierProductId,
      product_id: productId,
      dropship_link_id: link.id,
      supplier_product_title: productTitle.slice(0, 180),
      old_cost_usd: oldRounded,
      new_cost_usd: newRounded,
      suggested_retail_usd: suggested,
      previous_retail_usd: previousRetail,
      status: appliedRetail != null ? "applied" : "unread",
      resolved_at: appliedRetail != null ? new Date().toISOString() : null,
    });

    await admin
      .from("store_dropship_links")
      .update({
        last_cost_usd: newRounded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", link.id);

    revalidatePath("/dashboard/catalogo");
    revalidatePath("/dashboard/inventario");
    revalidatePath("/dashboard/ajustes");
  }

  if (linkedStoreIds.size > 0) {
    const { data: stores } = await admin
      .from("stores")
      .select("id, slug")
      .in("id", [...linkedStoreIds]);
    for (const store of (stores as Array<{ id?: string; slug?: string }> | null) ?? []) {
      revalidatePublicCatalogCache({
        slug: typeof store.slug === "string" ? store.slug : null,
        storeId: typeof store.id === "string" ? store.id : null,
      });
    }
  }
}

const RETAIL_PRODUCT_IN_CHUNK = 100;

async function resolveActiveVariantId(
  admin: SupabaseClient,
  productId: string,
): Promise<string | null> {
  const { data: variant } = await admin
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("is_active", true)
    .eq("is_default", true)
    .maybeSingle();

  if (variant && typeof variant.id === "string") return variant.id;

  const { data: fallback } = await admin
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return fallback && typeof fallback.id === "string" ? fallback.id : null;
}

async function getCurrentRetailUsd(
  admin: SupabaseClient,
  productId: string,
): Promise<number | null> {
  const variantId = await resolveActiveVariantId(admin, productId);
  if (!variantId) return null;

  const { data: price } = await admin
    .from("product_prices")
    .select("amount_usd")
    .eq("variant_id", variantId)
    .is("effective_until", null)
    .maybeSingle();

  if (!price) return null;
  return Number(price.amount_usd) || 0;
}

/** Precio de venta actual (`product_prices.amount_usd`) por producto de tienda. */
export async function loadRetailUsdByProductIds(
  admin: SupabaseClient,
  productIds: string[],
): Promise<{ prices: Map<string, number>; error?: string }> {
  const prices = new Map<string, number>();
  const unique = [
    ...new Set(productIds.filter((id) => typeof id === "string" && id)),
  ];
  if (unique.length === 0) return { prices };

  for (let index = 0; index < unique.length; index += RETAIL_PRODUCT_IN_CHUNK) {
    const chunk = unique.slice(index, index + RETAIL_PRODUCT_IN_CHUNK);
    const { data: variants, error: variantError } = await admin
      .from("product_variants")
      .select("id, product_id, is_default")
      .in("product_id", chunk)
      .eq("is_active", true);

    if (variantError) return { prices, error: variantError.message };

    const variantByProduct = new Map<string, string>();
    for (const row of (variants as Array<{
      id?: string;
      product_id?: string;
      is_default?: boolean;
    }> | null) ?? []) {
      const productId = typeof row.product_id === "string" ? row.product_id : "";
      const variantId = typeof row.id === "string" ? row.id : "";
      if (!productId || !variantId) continue;
      if (!variantByProduct.has(productId) || row.is_default) {
        variantByProduct.set(productId, variantId);
      }
    }

    const variantIds = [...variantByProduct.values()];
    if (variantIds.length === 0) continue;

    const { data: priceRows, error: priceError } = await admin
      .from("product_prices")
      .select("variant_id, amount_usd")
      .in("variant_id", variantIds)
      .is("effective_until", null);

    if (priceError) return { prices, error: priceError.message };

    const amountByVariant = new Map<string, number>();
    for (const row of (priceRows as Array<{
      variant_id?: string;
      amount_usd?: number | null;
    }> | null) ?? []) {
      const variantId = typeof row.variant_id === "string" ? row.variant_id : "";
      if (!variantId) continue;
      amountByVariant.set(
        variantId,
        Math.round((Number(row.amount_usd) || 0) * 100) / 100,
      );
    }

    for (const [productId, variantId] of variantByProduct) {
      const amount = amountByVariant.get(variantId);
      if (amount != null) prices.set(productId, amount);
    }
  }

  return { prices };
}

export async function applyRetailPriceToProduct(
  admin: SupabaseClient,
  productId: string,
  amountUsd: number,
): Promise<{ ok: boolean; error?: string }> {
  const retail = Math.round(Math.max(0, amountUsd) * 100) / 100;
  const variantId = await resolveActiveVariantId(admin, productId);

  if (!variantId) {
    return { ok: false, error: "El producto no tiene variante de precio." };
  }

  const { data: existingPrice, error: lookupError } = await admin
    .from("product_prices")
    .select("id")
    .eq("variant_id", variantId)
    .is("effective_until", null)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };

  const { error } = existingPrice
    ? await admin
        .from("product_prices")
        .update({ amount_usd: retail })
        .eq("id", existingPrice.id)
    : await admin.from("product_prices").insert({
        variant_id: variantId,
        amount_usd: retail,
      });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function resolveDropshipSettings(
  raw: unknown,
): DropshipPricingSettings {
  return normalizeDropshipPricingSettings(raw);
}
