"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { requireDropshipFeatureAccess } from "@/lib/dropship/feature-access";
import type { SupplierOrder } from "@/lib/supplier/order-types";
import {
  isSupplierOrderStatus,
  type SupplierOrderItem,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";
import {
  isSupplierB2bPaymentMethodKey,
  isSupplierOrderPaymentStatus,
  normalizeSupplierPaymentConfig,
  type SupplierB2bPaymentMethodKey,
  type SupplierOrderPaymentStatus,
  type SupplierPaymentConfig,
} from "@/lib/supplier/payment-types";
import {
  buildSupplierPaymentWhatsAppMessage,
  buildSupplierPaymentWhatsAppUrl,
} from "@/lib/supplier/whatsapp-payment-message";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

async function requireMerchantDropshipStore() {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error } as const;

  const feature = await requireDropshipFeatureAccess({
    email: auth.authUser.email,
  });
  if (!feature.ok) return { error: feature.error } as const;

  return {
    user: auth.authUser,
    store: auth.store,
    supabase,
  } as const;
}

function mapItem(row: Record<string, unknown>): SupplierOrderItem {
  const unitPrice = Number(row.unit_price_usd) || 0;
  const unitCost =
    row.unit_cost_usd != null ? Number(row.unit_cost_usd) || 0 : unitPrice;
  return {
    id: String(row.id),
    productId:
      typeof row.product_id === "string" && row.product_id
        ? row.product_id
        : null,
    productTitle: String(row.product_title ?? ""),
    quantity: Number(row.quantity) || 0,
    unitPriceUsd: unitPrice,
    unitCostUsd: unitCost,
    costLockedAt:
      typeof row.cost_locked_at === "string" ? row.cost_locked_at : null,
    lineTotalUsd: Number(row.line_total_usd) || 0,
  };
}

function mapOrder(
  row: Record<string, unknown>,
  items: SupplierOrderItem[],
): SupplierOrder {
  const statusRaw = String(row.status ?? "pendiente");
  const status: SupplierOrderStatus = isSupplierOrderStatus(statusRaw)
    ? statusRaw
    : "pendiente";
  const paymentStatusRaw = String(row.payment_status ?? "pendiente");
  const paymentStatus: SupplierOrderPaymentStatus =
    isSupplierOrderPaymentStatus(paymentStatusRaw)
      ? paymentStatusRaw
      : "pendiente";

  return {
    id: String(row.id),
    buyerName: String(row.buyer_name ?? ""),
    buyerPhone:
      typeof row.buyer_phone === "string" && row.buyer_phone.trim()
        ? row.buyer_phone.trim()
        : null,
    buyerAddress:
      typeof row.buyer_address === "string" && row.buyer_address.trim()
        ? row.buyer_address.trim()
        : null,
    shippingCarrier:
      typeof row.shipping_carrier === "string" && row.shipping_carrier.trim()
        ? row.shipping_carrier.trim()
        : null,
    shippingBranchName:
      typeof row.shipping_branch_name === "string" &&
      row.shipping_branch_name.trim()
        ? row.shipping_branch_name.trim()
        : null,
    shippingBranchAddress:
      typeof row.shipping_branch_address === "string" &&
      row.shipping_branch_address.trim()
        ? row.shipping_branch_address.trim()
        : null,
    status,
    trackingNumber:
      typeof row.tracking_number === "string" && row.tracking_number.trim()
        ? row.tracking_number.trim()
        : null,
    notes: String(row.notes ?? ""),
    totalUsd: Number(row.total_usd) || 0,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    items,
    sourceCatalogOrderId:
      typeof row.source_catalog_order_id === "string" &&
      row.source_catalog_order_id
        ? row.source_catalog_order_id
        : null,
    paymentStatus,
    paymentMethod:
      typeof row.payment_method === "string" && row.payment_method.trim()
        ? row.payment_method.trim()
        : null,
    paymentReference:
      typeof row.payment_reference === "string" && row.payment_reference.trim()
        ? row.payment_reference.trim()
        : null,
    paymentProofUrl:
      typeof row.payment_proof_url === "string" && row.payment_proof_url.trim()
        ? row.payment_proof_url.trim()
        : null,
    paymentNotes: String(row.payment_notes ?? ""),
    paymentNotifiedAt:
      typeof row.payment_notified_at === "string"
        ? row.payment_notified_at
        : null,
    paymentReportedAt:
      typeof row.payment_reported_at === "string"
        ? row.payment_reported_at
        : null,
  };
}

const ORDER_SELECT =
  "id, buyer_name, buyer_phone, buyer_address, shipping_carrier, shipping_branch_name, shipping_branch_address, status, tracking_number, notes, total_usd, created_at, updated_at, source_catalog_order_id, payment_status, payment_method, payment_reference, payment_proof_url, payment_notes, payment_notified_at, payment_reported_at, supplier_user_id";

export type DropshipSupplierPaymentContext = {
  supplierUserId: string;
  costTotalUsd: number;
  lineCount: number;
  paymentConfig: SupplierPaymentConfig;
  supplierOrder: SupplierOrder | null;
  whatsappUrl: string | null;
  whatsappMessage: string | null;
};

/**
 * Prepara el contexto B2B para un pedido del catálogo con líneas dropshipping:
 * datos de pago del proveedor + pedido proveedor vinculado (si existe).
 */
export async function getDropshipSupplierPaymentContext(
  catalogOrderId: string,
): Promise<ActionResult<{ context: DropshipSupplierPaymentContext | null }>> {
  const gate = await requireMerchantDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { store } = gate;

  const admin = createAdminClient();
  const { data: orderRow, error: orderError } = await admin
    .from("orders")
    .select(
      "id, store_id, customer_name, customer_phone, delivery_address, shipping_method, shipping_branch_name, shipping_branch_address, items, total_usd",
    )
    .eq("id", catalogOrderId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (orderError) return { error: orderError.message };
  if (!orderRow) return { error: "Pedido no encontrado." };

  const items = Array.isArray(orderRow.items) ? orderRow.items : [];
  const dropshipLines = items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.supplier_product_id === "string" && row.supplier_product_id;
  }) as Array<Record<string, unknown>>;

  if (dropshipLines.length === 0) {
    return { context: null };
  }

  const supplierProductIds = [
    ...new Set(
      dropshipLines.map((line) => String(line.supplier_product_id)),
    ),
  ];

  const { data: supplierProducts, error: productsError } = await admin
    .from("supplier_products")
    .select("id, created_by, title, base_price_usd")
    .in("id", supplierProductIds);

  if (productsError) return { error: productsError.message };

  const products =
    (supplierProducts as Record<string, unknown>[] | null) ?? [];
  if (products.length === 0) {
    return { context: null };
  }

  // Un proveedor por pedido B2B (el primero / dominante por líneas).
  const supplierCounts = new Map<string, number>();
  for (const product of products) {
    const supplierId = String(product.created_by ?? "");
    if (!supplierId) continue;
    supplierCounts.set(
      supplierId,
      (supplierCounts.get(supplierId) ?? 0) + 1,
    );
  }
  let supplierUserId = "";
  let maxCount = 0;
  for (const [id, count] of supplierCounts) {
    if (count > maxCount) {
      maxCount = count;
      supplierUserId = id;
    }
  }
  if (!supplierUserId) return { context: null };

  const productById = new Map(
    products.map((row) => [String(row.id), row]),
  );

  let costTotalUsd = 0;
  let lineCount = 0;
  for (const line of dropshipLines) {
    const supplierProductId = String(line.supplier_product_id);
    const product = productById.get(supplierProductId);
    if (!product || String(product.created_by) !== supplierUserId) continue;
    const qty = Number(line.quantity) || 0;
    const unitCost =
      line.unit_cost_usd != null
        ? Number(line.unit_cost_usd) || 0
        : Number(product.base_price_usd) || 0;
    costTotalUsd += Math.round(unitCost * qty * 100) / 100;
    lineCount += 1;
  }
  costTotalUsd = Math.round(costTotalUsd * 100) / 100;

  const { data: profile } = await admin
    .from("supplier_payment_profiles")
    .select("payment_config")
    .eq("supplier_user_id", supplierUserId)
    .maybeSingle();

  const paymentConfig = normalizeSupplierPaymentConfig(
    (profile as { payment_config?: unknown } | null)?.payment_config,
  );

  const { data: existingOrder } = await admin
    .from("supplier_orders")
    .select(ORDER_SELECT)
    .eq("source_catalog_order_id", catalogOrderId)
    .eq("merchant_store_id", store.id)
    .maybeSingle();

  let supplierOrder: SupplierOrder | null = null;
  if (existingOrder) {
    const { data: itemRows } = await admin
      .from("supplier_order_items")
      .select(
        "id, order_id, product_id, product_title, quantity, unit_price_usd, unit_cost_usd, cost_locked_at, line_total_usd",
      )
      .eq("order_id", String((existingOrder as Record<string, unknown>).id));
    const itemsMapped = (
      (itemRows as Record<string, unknown>[] | null) ?? []
    ).map(mapItem);
    supplierOrder = mapOrder(
      existingOrder as Record<string, unknown>,
      itemsMapped,
    );
  }

  const storeName = store.name?.trim() || "Mi tienda";

  let whatsappMessage: string | null = null;
  let whatsappUrl: string | null = null;
  if (supplierOrder && paymentConfig.whatsappPhone) {
    whatsappMessage = buildSupplierPaymentWhatsAppMessage({
      merchantStoreName: storeName,
      order: supplierOrder,
      finalCustomerName: String(orderRow.customer_name ?? ""),
      finalCustomerPhone:
        typeof orderRow.customer_phone === "string"
          ? orderRow.customer_phone
          : null,
      finalCustomerAddress:
        typeof orderRow.delivery_address === "string"
          ? orderRow.delivery_address
          : typeof orderRow.shipping_branch_address === "string"
            ? orderRow.shipping_branch_address
            : null,
    });
    whatsappUrl = buildSupplierPaymentWhatsAppUrl({
      supplierWhatsAppPhone: paymentConfig.whatsappPhone,
      message: whatsappMessage,
    });
  }

  return {
    context: {
      supplierUserId,
      costTotalUsd,
      lineCount,
      paymentConfig,
      supplierOrder,
      whatsappUrl,
      whatsappMessage,
    },
  };
}

/**
 * Crea (o actualiza) el pedido B2B al proveedor desde un pedido del catálogo
 * y registra la referencia de pago directo del emprendedor.
 */
export async function reportDropshipSupplierPayment(input: {
  catalogOrderId: string;
  paymentMethod: SupplierB2bPaymentMethodKey;
  paymentReference: string;
  paymentNotes?: string;
}): Promise<
  ActionResult<{
    order: SupplierOrder;
    whatsappUrl: string | null;
    whatsappMessage: string | null;
  }>
> {
  const gate = await requireMerchantDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { user, store } = gate;

  if (!isSupplierB2bPaymentMethodKey(input.paymentMethod)) {
    return { error: "Selecciona un método de pago válido." };
  }

  const reference = input.paymentReference.trim();
  if (reference.length < 4) {
    return { error: "Indica una referencia de pago (mínimo 4 caracteres)." };
  }

  const admin = createAdminClient();
  const { data: orderRow, error: orderError } = await admin
    .from("orders")
    .select(
      "id, store_id, customer_name, customer_phone, delivery_address, shipping_method, shipping_branch_name, shipping_branch_address, items",
    )
    .eq("id", input.catalogOrderId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (orderError) return { error: orderError.message };
  if (!orderRow) return { error: "Pedido no encontrado." };

  const items = Array.isArray(orderRow.items) ? orderRow.items : [];
  const dropshipLines = items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.supplier_product_id === "string" && row.supplier_product_id;
  }) as Array<Record<string, unknown>>;

  if (dropshipLines.length === 0) {
    return { error: "Este pedido no tiene productos de dropshipping." };
  }

  const supplierProductIds = [
    ...new Set(
      dropshipLines.map((line) => String(line.supplier_product_id)),
    ),
  ];

  const { data: supplierProducts, error: productsError } = await admin
    .from("supplier_products")
    .select("id, created_by, title, base_price_usd")
    .in("id", supplierProductIds);

  if (productsError) return { error: productsError.message };
  const products =
    (supplierProducts as Record<string, unknown>[] | null) ?? [];
  if (products.length === 0) {
    return { error: "No se encontraron los productos del proveedor." };
  }

  const supplierCounts = new Map<string, number>();
  for (const product of products) {
    const supplierId = String(product.created_by ?? "");
    if (!supplierId) continue;
    supplierCounts.set(
      supplierId,
      (supplierCounts.get(supplierId) ?? 0) + 1,
    );
  }
  let supplierUserId = "";
  let maxCount = 0;
  for (const [id, count] of supplierCounts) {
    if (count > maxCount) {
      maxCount = count;
      supplierUserId = id;
    }
  }
  if (!supplierUserId) {
    return { error: "No se pudo determinar el proveedor." };
  }

  const productById = new Map(
    products.map((row) => [String(row.id), row]),
  );

  const lockedAt = new Date().toISOString();
  const lineSnapshots: Array<{
    product_id: string;
    product_title: string;
    quantity: number;
    unit_price_usd: number;
    unit_cost_usd: number;
    cost_locked_at: string;
    line_total_usd: number;
  }> = [];
  let totalUsd = 0;

  for (const line of dropshipLines) {
    const supplierProductId = String(line.supplier_product_id);
    const product = productById.get(supplierProductId);
    if (!product || String(product.created_by) !== supplierUserId) continue;
    const qty = Math.floor(Number(line.quantity) || 0);
    if (qty <= 0) continue;
    const unitCost =
      line.unit_cost_usd != null
        ? Number(line.unit_cost_usd) || 0
        : Number(product.base_price_usd) || 0;
    const rounded = Math.round(unitCost * 100) / 100;
    const lineTotal = Math.round(rounded * qty * 100) / 100;
    totalUsd += lineTotal;
    lineSnapshots.push({
      product_id: supplierProductId,
      product_title: String(
        line.product_name ?? product.title ?? "Producto",
      ).slice(0, 200),
      quantity: qty,
      unit_price_usd: rounded,
      unit_cost_usd: rounded,
      cost_locked_at: lockedAt,
      line_total_usd: lineTotal,
    });
  }

  if (lineSnapshots.length === 0) {
    return { error: "No hay líneas dropshipping válidas para reportar." };
  }

  totalUsd = Math.round(totalUsd * 100) / 100;
  const now = new Date().toISOString();
  const paymentPatch = {
    payment_status: "reportado" as const,
    payment_method: input.paymentMethod,
    payment_reference: reference.slice(0, 120),
    payment_notes: (input.paymentNotes ?? "").trim().slice(0, 1000),
    payment_reported_at: now,
    updated_at: now,
  };

  const { data: existing } = await admin
    .from("supplier_orders")
    .select("id")
    .eq("source_catalog_order_id", input.catalogOrderId)
    .eq("merchant_store_id", store.id)
    .maybeSingle();

  let supplierOrderId: string;

  if (existing?.id) {
    supplierOrderId = String(existing.id);
    const { error: updateError } = await admin
      .from("supplier_orders")
      .update(paymentPatch)
      .eq("id", supplierOrderId);
    if (updateError) return { error: updateError.message };
  } else {
    const { data: created, error: createError } = await admin
      .from("supplier_orders")
      .insert({
        supplier_user_id: supplierUserId,
        merchant_user_id: user.id,
        merchant_store_id: store.id,
        source_catalog_order_id: input.catalogOrderId,
        buyer_name: String(orderRow.customer_name ?? "Cliente").slice(0, 160),
        buyer_phone:
          typeof orderRow.customer_phone === "string"
            ? orderRow.customer_phone.trim().slice(0, 40) || null
            : null,
        buyer_address:
          typeof orderRow.delivery_address === "string"
            ? orderRow.delivery_address.trim().slice(0, 500) || null
            : null,
        shipping_carrier:
          typeof orderRow.shipping_method === "string"
            ? orderRow.shipping_method.trim().slice(0, 60) || null
            : null,
        shipping_branch_name:
          typeof orderRow.shipping_branch_name === "string"
            ? orderRow.shipping_branch_name.trim().slice(0, 160) || null
            : null,
        shipping_branch_address:
          typeof orderRow.shipping_branch_address === "string"
            ? orderRow.shipping_branch_address.trim().slice(0, 320) || null
            : null,
        notes: "Pedido B2B generado desde venta del catálogo (dropshipping).",
        status: "pendiente",
        total_usd: totalUsd,
        ...paymentPatch,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return { error: createError?.message ?? "No se pudo crear el pedido B2B." };
    }
    supplierOrderId = String(created.id);

    const { error: itemsError } = await admin.from("supplier_order_items").insert(
      lineSnapshots.map((line) => ({
        order_id: supplierOrderId,
        ...line,
      })),
    );
    if (itemsError) return { error: itemsError.message };
  }

  const { data: orderFresh, error: freshError } = await admin
    .from("supplier_orders")
    .select(ORDER_SELECT)
    .eq("id", supplierOrderId)
    .single();
  if (freshError || !orderFresh) {
    return { error: freshError?.message ?? "No se pudo leer el pedido B2B." };
  }

  const { data: itemRows } = await admin
    .from("supplier_order_items")
    .select(
      "id, order_id, product_id, product_title, quantity, unit_price_usd, unit_cost_usd, cost_locked_at, line_total_usd",
    )
    .eq("order_id", supplierOrderId);

  const mapped = mapOrder(
    orderFresh as Record<string, unknown>,
    ((itemRows as Record<string, unknown>[] | null) ?? []).map(mapItem),
  );

  const { data: profile } = await admin
    .from("supplier_payment_profiles")
    .select("payment_config")
    .eq("supplier_user_id", supplierUserId)
    .maybeSingle();
  const paymentConfig = normalizeSupplierPaymentConfig(
    (profile as { payment_config?: unknown } | null)?.payment_config,
  );

  const storeName = store.name?.trim() || "Mi tienda";

  const whatsappMessage = buildSupplierPaymentWhatsAppMessage({
    merchantStoreName: storeName,
    order: mapped,
    finalCustomerName: String(orderRow.customer_name ?? ""),
    finalCustomerPhone:
      typeof orderRow.customer_phone === "string"
        ? orderRow.customer_phone
        : null,
    finalCustomerAddress:
      typeof orderRow.delivery_address === "string"
        ? orderRow.delivery_address
        : typeof orderRow.shipping_branch_address === "string"
          ? orderRow.shipping_branch_address
          : null,
  });
  const whatsappUrl = paymentConfig.whatsappPhone
    ? buildSupplierPaymentWhatsAppUrl({
        supplierWhatsAppPhone: paymentConfig.whatsappPhone,
        message: whatsappMessage,
      })
    : null;

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/proveedor/dashboard");

  return {
    order: mapped,
    whatsappUrl,
    whatsappMessage,
  };
}

/** Marca que el comerciante abrió WhatsApp para notificar el pago. */
export async function markDropshipSupplierPaymentNotified(
  supplierOrderId: string,
): Promise<ActionResult<{ ok: true }>> {
  const gate = await requireMerchantDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { store } = gate;

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_orders")
    .update({
      payment_notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplierOrderId)
    .eq("merchant_store_id", store.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/proveedor/dashboard");
  return { ok: true };
}
