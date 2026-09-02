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
import {
  isPublishedForDropship,
  resolvePrecioMayoristaUsd,
} from "@/lib/supplier/wholesale-price";
import {
  clampGiftCardCustomAmount,
  isGiftCardCustomVariant,
  isGiftCardMetadata,
  GIFT_CARD_PRODUCT_SLUG,
} from "@/lib/gift-cards/catalog";
import { isPlatformAdminOwnedStore } from "@/lib/gift-cards/admin-store";
import { GIFT_CARD_STORE_DENIED_MESSAGE } from "@/lib/gift-cards/types";

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
  const adminOwnedStore = await isPlatformAdminOwnedStore(storeId);

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, variants, metadata, slug")
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
    .select("id, product_id, name, is_default, attributes")
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

  const { data: dropshipLinks } = await admin
    .from("store_dropship_links")
    .select(
      "product_id, supplier_product_id, supplier_products(precio_mayorista, publication_status, catalog_visible, is_visible, is_active, stock, reserved_quantity, title)",
    )
    .eq("store_id", storeId)
    .in("product_id", productIds);

  type DropshipCostInfo = {
    supplierProductId: string;
    costUsd: number;
    stock: number;
    title: string;
  };

  const dropshipCostByProduct = new Map<string, DropshipCostInfo>();
  for (const row of (dropshipLinks as Record<string, unknown>[] | null) ?? []) {
    const productId = String(row.product_id ?? "");
    const supplierProductId = String(row.supplier_product_id ?? "");
    const supplier = row.supplier_products as {
      precio_mayorista?: number | null;
      publication_status?: string;
      catalog_visible?: boolean;
      is_visible?: boolean;
      is_active?: boolean;
      stock?: number;
      reserved_quantity?: number;
      title?: string;
    } | null;
    if (!productId || !supplierProductId) continue;
    if (!isPublishedForDropship(supplier ?? {})) continue;
    const costUsd = resolvePrecioMayoristaUsd(supplier ?? {});
    if (costUsd == null) continue;
    dropshipCostByProduct.set(productId, {
      supplierProductId,
      costUsd,
      stock: Math.max(0, Math.floor(Number(supplier?.stock) || 0)),
      title: String(supplier?.title ?? "Mayorista"),
    });
  }

  // Validar stock agregado del mayorista antes de armar el pedido.
  const requestedBySupplier = new Map<
    string,
    { qty: number; title: string; stock: number }
  >();
  for (const line of lines) {
    const product = productMap.get(line.productId) as
      | { id: string; variants: unknown; metadata?: unknown; slug?: string }
      | undefined;
    if (!product) continue;
    const giftCard =
      isGiftCardMetadata(
        (product.metadata as Record<string, unknown> | null) ?? null,
      ) || product.slug === GIFT_CARD_PRODUCT_SLUG;
    if (giftCard) continue;
    const dropship = dropshipCostByProduct.get(line.productId);
    if (!dropship) continue;
    const qty = Math.max(1, Math.floor(line.quantity));
    const current = requestedBySupplier.get(dropship.supplierProductId);
    if (current) {
      current.qty += qty;
    } else {
      requestedBySupplier.set(dropship.supplierProductId, {
        qty,
        title: dropship.title,
        stock: dropship.stock,
      });
    }
  }
  for (const entry of requestedBySupplier.values()) {
    if (entry.qty > entry.stock) {
      return {
        items: [],
        error: `Stock insuficiente del mayorista para "${entry.title}" (disponible: ${entry.stock}).`,
      };
    }
  }

  const resolved: OrderLineItem[] = [];
  const costLockedAt = new Date().toISOString();

  for (const line of lines) {
    const product = productMap.get(line.productId) as
      | { id: string; variants: unknown; metadata?: unknown; slug?: string }
      | undefined;
    if (!product) {
      return { items: [], error: "Uno de los productos ya no está disponible." };
    }

    const isGiftCard =
      isGiftCardMetadata(
        (product.metadata as Record<string, unknown> | null) ?? null,
      ) || product.slug === GIFT_CARD_PRODUCT_SLUG;

    if (isGiftCard && !adminOwnedStore) {
      return { items: [], error: GIFT_CARD_STORE_DENIED_MESSAGE };
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

    let priceExtraUsd = jsonVariant?.price_extra_usd ?? 0;
    if (isGiftCard) {
      const custom =
        isGiftCardCustomVariant(inventoryVariantRow?.attributes) ||
        isGiftCardCustomVariant(jsonVariant?.attributes);
      if (custom) {
        const clamped = clampGiftCardCustomAmount(
          Number(line.modifiersExtraUsd ?? 0),
        );
        if (clamped == null) {
          return {
            items: [],
            error:
              "Indica un monto válido para la tarjeta de regalo (entre $5 y $500).",
          };
        }
        priceExtraUsd = clamped;
      }
    } else {
      priceExtraUsd += Math.max(0, Number(line.modifiersExtraUsd ?? 0) || 0);
    }

    const pricing = resolveUnitPriceUsd({
      retailUsd: defaultPricing.amount_usd,
      wholesalePriceUsd: isGiftCard
        ? null
        : defaultPricing.wholesale_price_usd,
      wholesaleMinQty: isGiftCard ? null : defaultPricing.wholesale_min_qty,
      quantity: line.quantity,
      priceExtraUsd,
      wholesaleEnabled: isGiftCard ? false : wholesaleEnabled,
    });

    const tolerance = 0.02;
    if (Math.abs(pricing.unitPriceUsd - line.unitPriceUsd) > tolerance) {
      return {
        items: [],
        error: "Los precios del carrito cambiaron. Revisa tu pedido e intenta de nuevo.",
      };
    }

    const dropship = isGiftCard
      ? undefined
      : dropshipCostByProduct.get(line.productId);
    const item: OrderLineItem = {
      product_id: line.productId,
      variant_id: inventoryVariantId,
      product_name: line.productName,
      variant_name: line.variantName,
      quantity: Math.max(1, Math.floor(line.quantity)),
      unit_price_usd: pricing.unitPriceUsd,
      line_total_usd: pricing.unitPriceUsd * line.quantity,
      pricing_tier: pricing.wholesaleApplied ? "wholesale" : "retail",
      retail_unit_price_usd: pricing.retailUnitUsd,
      ...(isGiftCard ? { is_gift_card: true } : {}),
    };

    if (dropship) {
      item.unit_cost_usd = Math.round(dropship.costUsd * 100) / 100;
      item.supplier_product_id = dropship.supplierProductId;
      item.cost_locked_at = costLockedAt;
    }

    resolved.push(item);
  }

  return { items: resolved };
}
