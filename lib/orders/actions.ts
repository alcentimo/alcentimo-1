"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOrderCustomerDetails } from "@/lib/customers/get-customer-checkout-context";
import { getStoreBySlug } from "@/lib/stores";
import { buildTransactionalOrderWhatsAppMessage } from "@/lib/whatsapp-formatter";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { getWhatsAppOrderDetailUrl } from "@/lib/orders/order-links";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { getShippingMethod } from "@/src/config/shipping-methods";
import type { PaymentMethodKey, ShippingCarrierKey } from "@/lib/store-settings/types";
import { uploadOrderPaymentProof } from "@/lib/orders/storage";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { reserveOrderInventory } from "@/lib/orders/order-inventory";
import { calculatePromotionDiscountUsd } from "@/lib/promotions/discount";
import type { OrderLineItem, SubmitOrderLineInput } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  getStoreOrders,
  type StoreOrdersResult,
} from "@/lib/orders/get-store-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";

export interface SubmitTransactionalOrderResult {
  error?: string;
  orderId?: string;
  whatsappUrl?: string;
}

function buildOrderItems(lines: SubmitOrderLineInput[]): OrderLineItem[] {
  return lines.map((line) => ({
    product_id: line.productId,
    variant_id: line.variantId,
    product_name: line.productName,
    variant_name: line.variantName,
    quantity: line.quantity,
    unit_price_usd: line.unitPriceUsd,
    line_total_usd: line.unitPriceUsd * line.quantity,
  }));
}

export async function submitTransactionalOrder(
  formData: FormData,
): Promise<SubmitTransactionalOrderResult> {
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  const customerNameRaw = String(formData.get("customerName") ?? "").trim();
  const customerPhoneRaw = String(formData.get("customerPhone") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");
  const proof = formData.get("paymentProof");
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "").trim();
  const shippingMethodRaw = String(formData.get("shippingMethod") ?? "").trim();
  const promotionCodeRaw = String(formData.get("promotionCode") ?? "").trim();

  if (!storeSlug) {
    return { error: "Tienda no válida." };
  }

  let lines: SubmitOrderLineInput[];
  try {
    const parsed = JSON.parse(itemsRaw) as SubmitOrderLineInput[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "El carrito está vacío." };
    }
    lines = parsed;
  } catch {
    return { error: "Pedido inválido." };
  }

  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { error: "Tienda no encontrada." };
  }

  const customerResult = await resolveOrderCustomerDetails(store.id, {
    customerName: customerNameRaw,
    customerPhone: customerPhoneRaw,
  });
  if (!customerResult.ok) {
    return { error: customerResult.error };
  }

  const { customerUserId, customerName, customerPhone } = customerResult;
  const normalizedPhone = normalizeWhatsAppPhone(customerPhone);
  if (!normalizedPhone) {
    return { error: "Indica un teléfono válido (mínimo 10 dígitos)." };
  }

  if (!(proof instanceof File) || proof.size === 0) {
    return { error: "Adjunta el comprobante de pago." };
  }

  const orderItems = buildOrderItems(lines);
  const subtotalUsd = orderItems.reduce((sum, item) => sum + item.line_total_usd, 0);

  if (subtotalUsd <= 0) {
    return { error: "El total del pedido no es válido." };
  }

  let discountUsd = 0;
  let promotionLabel: string | undefined;
  const admin = createAdminClient();

  if (promotionCodeRaw) {
    if (!customerUserId) {
      return {
        error: "Debes registrarte como cliente de la tienda para usar promociones.",
      };
    }

    const { data: promotionValidation, error: promotionError } = await admin.rpc(
      "validate_customer_promotion" as never,
      {
        p_store_slug: storeSlug,
        p_code: promotionCodeRaw,
        p_user_id: customerUserId,
      } as never,
    );

    if (promotionError) {
      return { error: promotionError.message };
    }

    const validation = promotionValidation as {
      error?: string;
      success?: boolean;
      code?: string;
      name?: string;
      discount_percentage?: number;
    } | null;

    if (!validation || validation.error || !validation.discount_percentage) {
      return { error: validation?.error ?? "Promoción no válida." };
    }

    discountUsd = calculatePromotionDiscountUsd(
      subtotalUsd,
      Number(validation.discount_percentage),
    );
    promotionLabel = validation.name ?? validation.code;
  }

  const totalUsd = Math.max(0, subtotalUsd - discountUsd);

  const orderId = crypto.randomUUID();

  const proofUpload = await uploadOrderPaymentProof(store.id, orderId, proof);
  if (proofUpload.error || !proofUpload.url) {
    return { error: proofUpload.error ?? "No se pudo subir el comprobante." };
  }

  const { error: insertError } = await admin.from("orders").insert({
    id: orderId,
    store_id: store.id,
    customer_user_id: customerUserId,
    customer_name: customerName,
    customer_phone: customerPhone,
    items: orderItems,
    total_usd: totalUsd,
    payment_proof_url: proofUpload.url,
    estado: "pendiente",
  });

  if (insertError) {
    return { error: insertError.message };
  }

  const reserveResult = await reserveOrderInventory(admin, orderId);
  if (reserveResult.error) {
    await admin.from("orders").delete().eq("id", orderId);
    return { error: reserveResult.error };
  }

  if (promotionCodeRaw && customerUserId) {
    const { data: redeemResult, error: redeemError } = await admin.rpc(
      "redeem_customer_promotion" as never,
      {
        p_store_slug: storeSlug,
        p_code: promotionCodeRaw,
        p_user_id: customerUserId,
      } as never,
    );

    if (redeemError) {
      await admin.from("orders").delete().eq("id", orderId);
      return { error: redeemError.message };
    }

    const redeemed = redeemResult as { error?: string; success?: boolean } | null;
    if (redeemed?.error) {
      await admin.from("orders").delete().eq("id", orderId);
      return { error: redeemed.error };
    }
  }

  const settings = await getPublicStoreSettingsConfig(store.id);
  const purchaseInfo = buildPublicPurchaseInfo(settings);

  const paymentLabel = paymentMethodRaw
    ? getPaymentMethod(paymentMethodRaw as PaymentMethodKey).label
    : undefined;
  const shippingLabel = shippingMethodRaw
    ? getShippingMethod(shippingMethodRaw as ShippingCarrierKey).label
    : undefined;

  const message = buildTransactionalOrderWhatsAppMessage({
    customerName,
    items: orderItems,
    totalUsd,
    orderDetailUrl: getWhatsAppOrderDetailUrl(orderId),
    paymentLabel,
    shippingLabel,
    subtotalUsd: discountUsd > 0 ? subtotalUsd : undefined,
    discountUsd: discountUsd > 0 ? discountUsd : undefined,
    promotionLabel,
  });

  const whatsappUrl =
    buildWhatsAppOrderUrl(purchaseInfo.whatsappPhone, message) ?? undefined;

  revalidatePath(`/c/${storeSlug}`);
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/analiticas");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath(`/pedidos/${orderId}`);

  return {
    orderId,
    whatsappUrl,
  };
}

export async function fetchStoreOrdersPage(options: {
  offset: number;
  limit?: number;
}): Promise<StoreOrdersResult & { error?: string }> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return {
      orders: [],
      totalCount: 0,
      hasMore: false,
      error: auth.error,
    };
  }

  try {
    return await getStoreOrders(auth.store.id, {
      offset: options.offset,
      limit: options.limit ?? ORDERS_PAGE_SIZE,
    });
  } catch (error) {
    return {
      orders: [],
      totalCount: 0,
      hasMore: false,
      error:
        error instanceof Error ? error.message : "No se pudieron cargar pedidos.",
    };
  }
}
