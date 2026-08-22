"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { validateCustomerPhoneInput } from "@/lib/customers/phone-auth";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import {
  consumeDropshipStockForOrderLines,
  restoreDropshipStockForOrderLines,
} from "@/lib/dropship/supplier-stock";
import { reserveOrderInventory } from "@/lib/orders/order-inventory";
import { enrichOrderItemsWithStockUnits } from "@/lib/orders/stationery-inventory";
import { resolveOrderLinesWithPricing } from "@/lib/orders/resolve-order-line-prices";
import type { CatalogOrder, SubmitOrderLineInput } from "@/lib/orders/types";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";
import {
  paymentMethodRequiresProof,
} from "@/src/config/payment-methods";
import type { PaymentMethodKey, ShippingCarrierKey } from "@/lib/store-settings/types";
import { PAYMENT_METHOD_BY_KEY } from "@/src/config/payment-methods";
import { SHIPPING_METHOD_BY_KEY } from "@/src/config/shipping-methods";

export type CreateManualOrderLineInput = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceUsd: number;
};

export type CreateManualOrderInput = {
  lines: CreateManualOrderLineInput[];
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  paymentMethod: string;
  shippingMethod: string;
};

export type CreateManualOrderResult =
  | { ok: true; order: CatalogOrder }
  | { ok: false; error: string };

function isPaymentMethodKey(value: string): value is PaymentMethodKey {
  return value in PAYMENT_METHOD_BY_KEY;
}

function isShippingMethodKey(value: string): value is ShippingCarrierKey {
  return value in SHIPPING_METHOD_BY_KEY;
}

export async function createManualExternalOrder(
  input: CreateManualOrderInput,
): Promise<CreateManualOrderResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const customerName = input.customerName.trim();
  if (customerName.length < 2) {
    return { ok: false, error: "Indica el nombre del cliente." };
  }

  const phoneResult = validateCustomerPhoneInput(input.customerPhone);
  if (!phoneResult.ok) {
    return { ok: false, error: phoneResult.error };
  }

  if (!isPaymentMethodKey(input.paymentMethod)) {
    return { ok: false, error: "Selecciona un método de pago válido." };
  }

  if (!isShippingMethodKey(input.shippingMethod)) {
    return { ok: false, error: "Selecciona un courier o método de envío." };
  }

  const deliveryAddress = input.deliveryAddress.trim().slice(0, 320);
  if (input.shippingMethod !== "pickup" && deliveryAddress.length < 8) {
    return {
      ok: false,
      error: "Indica la dirección de envío del cliente (mínimo 8 caracteres).",
    };
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, error: "Agrega al menos un producto de tu catálogo." };
  }

  const lines: SubmitOrderLineInput[] = input.lines.map((line) => ({
    productId: String(line.productId ?? "").trim(),
    variantId: String(line.variantId ?? "").trim(),
    productName: String(line.productName ?? "Producto").trim() || "Producto",
    variantName: String(line.variantName ?? "Estándar").trim() || "Estándar",
    quantity: Math.max(0, Math.floor(Number(line.quantity ?? 0))),
    unitPriceUsd: Number(line.unitPriceUsd ?? 0),
  }));

  for (const line of lines) {
    if (!line.productId || !line.variantId) {
      return { ok: false, error: "Un producto seleccionado ya no está disponible." };
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return {
        ok: false,
        error: `La cantidad de "${line.productName}" no es válida.`,
      };
    }
  }

  const admin = createAdminClient();
  const pricedLines = await resolveOrderLinesWithPricing(
    admin,
    auth.store.id,
    lines,
  );
  if (pricedLines.error) {
    return { ok: false, error: pricedLines.error };
  }

  const enrichedOrderItems = await enrichOrderItemsWithStockUnits(
    admin,
    auth.store.id,
    pricedLines.items,
  );
  const totalUsd = Math.round(
    enrichedOrderItems.reduce((sum, item) => sum + item.line_total_usd, 0) * 100,
  ) / 100;

  if (totalUsd <= 0) {
    return { ok: false, error: "El total del pedido no es válido." };
  }

  const fulfillmentType: CatalogOrder["fulfillment_type"] = isNationalCarrierKey(
    input.shippingMethod,
  )
    ? "shipping"
    : input.shippingMethod === "pickup"
      ? "pickup"
      : "delivery";

  const expectsPaymentProof = paymentMethodRequiresProof(input.paymentMethod);
  const orderId = crypto.randomUUID();
  const orderInsert = {
    id: orderId,
    store_id: auth.store.id,
    customer_user_id: null,
    customer_name: customerName.slice(0, 120),
    customer_phone: phoneResult.phone,
    items: enrichedOrderItems,
    total_usd: totalUsd,
    payment_proof_url: expectsPaymentProof ? null : "",
    estado: "pendiente" as const,
    fulfillment_type: fulfillmentType,
    shipping_method: input.shippingMethod,
    delivery_address: fulfillmentType === "pickup" ? null : deliveryAddress,
  };

  const { data: created, error: insertError } = await admin
    .from("orders")
    .insert(orderInsert)
    .select(
      "id, store_id, customer_name, customer_phone, customer_user_id, items, total_usd, payment_proof_url, estado, created_at, location_id, fulfillment_type, shipping_method, shipping_branch_code, shipping_branch_name, shipping_branch_address, delivery_address, tracking_number",
    )
    .single();

  if (insertError || !created) {
    return { ok: false, error: insertError?.message ?? "No se pudo guardar el pedido." };
  }

  const dropshipStock = await consumeDropshipStockForOrderLines(
    admin,
    auth.store.id,
    enrichedOrderItems,
  );
  if (dropshipStock.error) {
    await admin.from("orders").delete().eq("id", orderId);
    return { ok: false, error: dropshipStock.error };
  }

  const reserveResult = await reserveOrderInventory(admin, orderId);
  if (reserveResult.error) {
    if (dropshipStock.consumed.length > 0) {
      await restoreDropshipStockForOrderLines(admin, enrichedOrderItems);
    }
    await admin.from("orders").delete().eq("id", orderId);
    return { ok: false, error: reserveResult.error };
  }

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/liquidacion");
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/analiticas");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePublicCatalogCache({
    slug: auth.store.slug,
    storeId: auth.store.id,
  });

  const order: CatalogOrder = {
    id: created.id as string,
    store_id: created.store_id as string,
    customer_name: created.customer_name as string,
    customer_phone: (created.customer_phone as string | null) ?? null,
    customer_user_id: (created.customer_user_id as string | null) ?? null,
    items: enrichedOrderItems,
    total_usd: Number(created.total_usd) || totalUsd,
    payment_proof_url: created.payment_proof_url as string | null,
    estado: "pendiente",
    created_at: created.created_at as string,
    location_id: (created.location_id as string | null) ?? null,
    location_name: null,
    fulfillment_type:
      (created.fulfillment_type as CatalogOrder["fulfillment_type"]) ??
      fulfillmentType,
    shipping_method: (created.shipping_method as string | null) ?? input.shippingMethod,
    shipping_branch_code: (created.shipping_branch_code as string | null) ?? null,
    shipping_branch_name: (created.shipping_branch_name as string | null) ?? null,
    shipping_branch_address:
      (created.shipping_branch_address as string | null) ?? null,
    delivery_address: (created.delivery_address as string | null) ?? null,
    tracking_number: (created.tracking_number as string | null) ?? null,
  };

  return { ok: true, order };
}
