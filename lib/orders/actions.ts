"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreBySlug } from "@/lib/stores";
import { buildTransactionalOrderWhatsAppMessage } from "@/lib/whatsapp-formatter";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { getPublicOrderDetailUrl } from "@/lib/orders/order-links";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { uploadOrderPaymentProof } from "@/lib/orders/storage";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import type { OrderLineItem, SubmitOrderLineInput } from "@/lib/orders/types";

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
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");
  const proof = formData.get("paymentProof");

  if (!storeSlug) {
    return { error: "Tienda no válida." };
  }

  if (!customerName || customerName.length < 2) {
    return { error: "Indica tu nombre para el pedido." };
  }

  const normalizedPhone = normalizeWhatsAppPhone(customerPhone);
  if (!normalizedPhone) {
    return { error: "Indica un teléfono válido (mínimo 10 dígitos)." };
  }

  if (!(proof instanceof File) || proof.size === 0) {
    return { error: "Adjunta el comprobante de pago." };
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

  const orderItems = buildOrderItems(lines);
  const totalUsd = orderItems.reduce((sum, item) => sum + item.line_total_usd, 0);

  if (totalUsd <= 0) {
    return { error: "El total del pedido no es válido." };
  }

  const admin = createAdminClient();
  const orderId = crypto.randomUUID();

  const proofUpload = await uploadOrderPaymentProof(store.id, orderId, proof);
  if (proofUpload.error || !proofUpload.url) {
    return { error: proofUpload.error ?? "No se pudo subir el comprobante." };
  }

  const { error: insertError } = await admin.from("orders").insert({
    id: orderId,
    store_id: store.id,
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

  const settings = await getPublicStoreSettingsConfig(store.id);
  const purchaseInfo = buildPublicPurchaseInfo(settings);
  const message = buildTransactionalOrderWhatsAppMessage({
    customerName,
    items: orderItems,
    totalUsd,
    orderDetailUrl: getPublicOrderDetailUrl(orderId),
  });

  const whatsappUrl =
    buildWhatsAppOrderUrl(purchaseInfo.whatsappPhone, message) ?? undefined;

  revalidatePath(`/c/${storeSlug}`);
  revalidatePath("/dashboard/pedidos");
  revalidatePath(`/pedidos/${orderId}`);

  return {
    orderId,
    whatsappUrl,
  };
}
