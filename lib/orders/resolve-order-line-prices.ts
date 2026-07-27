import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveUnitPriceUsd } from "@/lib/catalog/pricing";
import { parseVariantsJson } from "@/lib/products/variants";
import type { OrderLineItem, SubmitOrderLineInput } from "@/lib/orders/types";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import {
  resolveOrderLineInventoryVariantId,
  validateSubmitOrderLineInput,
  type ProductVariantRow,
} from "@/lib/orders/resolve-inventory-variant-id";

export async function resolveOrderLinesWithPricing(
  admin: SupabaseClient,
  storeId: string,
  lines: SubmitOrderLineInput[],
): Promise<{ items: OrderLineItem[]; error?: string }> {
  if (lines.length === 0) {
    return { items: [], error: "El carrito está vacío." };
  }

  for (const line of lines) {
    const lineError = validateSubmitOrderLineInput(line);
    if (lineError) {
      return { items: [], error: lineError };
    }
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

  const { data: variantRows, error: variantRowsError } = await admin
    .from("product_variants")
    .select("id, product_id, name, is_default")
    .in("product_id", productIds)
    .eq("is_active", true);

  if (variantRowsError) {
    return { items: [], error: variantRowsError.message };
  }

  const dbVariants = (variantRows ?? []) as ProductVariantRow[];

  const defaultVariantByProduct = new Map<string, string>();
  for (const row of dbVariants) {
    if (row.is_default) {
      defaultVariantByProduct.set(row.product_id, row.id);
    }
  }
  for (const productId of productIds) {
    if (defaultVariantByProduct.has(productId)) continue;
    const fallback = dbVariants.find((row) => row.product_id === productId);
    if (fallback) {
      defaultVariantByProduct.set(productId, fallback.id);
    }
  }

  const defaultVariantIds = [...defaultVariantByProduct.values()];
  if (defaultVariantIds.length === 0) {
    return { items: [], error: "No se pudo validar el inventario del pedido." };
  }

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

    const defaultVariantId = defaultVariantByProduct.get(line.productId);
    if (!defaultVariantId) {
      return {
        items: [],
        error: `"${line.productName}" ya no tiene inventario disponible.`,
      };
    }

    const inventoryVariantId = resolveOrderLineInventoryVariantId({
      catalogVariantId: line.variantId,
      productId: line.productId,
      productVariantsJson: product.variants,
      dbVariants,
      defaultVariantId,
    });

    if (!inventoryVariantId) {
      return {
        items: [],
        error: `"${line.productName}" no se pudo vincular al inventario. Actualiza el carrito e intenta de nuevo.`,
      };
    }

    const defaultPricing = defaultPriceByProduct.get(line.productId);
    if (!defaultPricing) {
      return { items: [], error: "No se pudo validar el precio del pedido." };
    }

    const jsonVariants = parseVariantsJson(product.variants);
    const inventoryVariantRow = dbVariants.find(
      (row) => row.id === inventoryVariantId,
    );
    const jsonVariant =
      jsonVariants.find((variant) => variant.id === line.variantId) ??
      jsonVariants.find(
        (variant) =>
          inventoryVariantRow &&
          variant.name.trim().toLowerCase() ===
            inventoryVariantRow.name.trim().toLowerCase(),
      );
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
      variant_id: inventoryVariantId,
      product_name: line.productName,
      variant_name: line.variantName,
      quantity: Math.max(1, Math.floor(line.quantity)),
      unit_price_usd: pricing.unitPriceUsd,
      line_total_usd: pricing.unitPriceUsd * line.quantity,
      pricing_tier: pricing.wholesaleApplied ? "wholesale" : "retail",
      retail_unit_price_usd: pricing.retailUnitUsd,
    });
  }

  return { items: resolved };
}
