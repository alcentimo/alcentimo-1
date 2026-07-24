import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveUnitPriceUsd } from "@/lib/catalog/pricing";
import { parseVariantsJson } from "@/lib/products/variants";
import type { OrderLineItem, SubmitOrderLineInput } from "@/lib/orders/types";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";

export async function resolveOrderLinesWithPricing(
  admin: SupabaseClient,
  storeId: string,
  lines: SubmitOrderLineInput[],
): Promise<{ items: OrderLineItem[]; error?: string }> {
  if (lines.length === 0) {
    return { items: [], error: "El carrito está vacío." };
  }

  const storeSettings = await getStoreSettingsConfig(storeId);
  const wholesaleEnabled = storeSettings.catalogCurrency.wholesaleEnabled;

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, variants")
    .eq("store_id", storeId)
    .in("id", productIds);

  if (productsError) {
    return { items: [], error: productsError.message };
  }

  const productMap = new Map(
    (products ?? []).map((row) => [row.id as string, row]),
  );

  const { data: defaultVariants, error: defaultVariantsError } = await admin
    .from("product_variants")
    .select("id, product_id")
    .in("product_id", productIds)
    .eq("is_default", true);

  if (defaultVariantsError) {
    return { items: [], error: defaultVariantsError.message };
  }

  const defaultVariantByProduct = new Map<string, string>();
  for (const row of defaultVariants ?? []) {
    defaultVariantByProduct.set(row.product_id as string, row.id as string);
  }

  const defaultVariantIds = [...defaultVariantByProduct.values()];
  const { data: defaultPrices, error: pricesError } = await admin
    .from("product_prices")
    .select("variant_id, amount_usd, wholesale_price_usd, wholesale_min_qty")
    .in("variant_id", defaultVariantIds)
    .is("effective_until", null);

  if (pricesError) {
    return { items: [], error: pricesError.message };
  }

  const defaultPriceByProduct = new Map<
    string,
    {
      amount_usd: number;
      wholesale_price_usd: number | null;
      wholesale_min_qty: number | null;
    }
  >();

  for (const row of defaultPrices ?? []) {
    const productId = [...defaultVariantByProduct.entries()].find(
      ([, variantId]) => variantId === row.variant_id,
    )?.[0];
    if (!productId) continue;
    defaultPriceByProduct.set(productId, {
      amount_usd: Number(row.amount_usd ?? 0),
      wholesale_price_usd:
        row.wholesale_price_usd != null
          ? Number(row.wholesale_price_usd)
          : null,
      wholesale_min_qty:
        row.wholesale_min_qty != null ? Number(row.wholesale_min_qty) : null,
    });
  }

  const resolved: OrderLineItem[] = [];

  for (const line of lines) {
    const product = productMap.get(line.productId);
    if (!product) {
      return { items: [], error: "Uno de los productos ya no está disponible." };
    }

    const defaultPricing = defaultPriceByProduct.get(line.productId);
    if (!defaultPricing) {
      return { items: [], error: "No se pudo validar el precio del pedido." };
    }

    const jsonVariants = parseVariantsJson(product.variants);
    const jsonVariant = jsonVariants.find((variant) => variant.id === line.variantId);
    const priceExtraUsd = jsonVariant?.price_extra_usd ?? 0;

    const pricing = resolveUnitPriceUsd({
      retailUsd: defaultPricing.amount_usd,
      wholesalePriceUsd: defaultPricing.wholesale_price_usd,
      wholesaleMinQty: defaultPricing.wholesale_min_qty,
      quantity: line.quantity,
      priceExtraUsd,
      wholesaleEnabled,
    });

    const tolerance = 0.02;
    if (Math.abs(pricing.unitPriceUsd - line.unitPriceUsd) > tolerance) {
      return {
        items: [],
        error: "Los precios del carrito cambiaron. Revisa tu pedido e intenta de nuevo.",
      };
    }

    resolved.push({
      product_id: line.productId,
      variant_id: line.variantId,
      product_name: line.productName,
      variant_name: line.variantName,
      quantity: line.quantity,
      unit_price_usd: pricing.unitPriceUsd,
      line_total_usd: pricing.unitPriceUsd * line.quantity,
      pricing_tier: pricing.wholesaleApplied ? "wholesale" : "retail",
      retail_unit_price_usd: pricing.retailUnitUsd,
    });
  }

  return { items: resolved };
}
