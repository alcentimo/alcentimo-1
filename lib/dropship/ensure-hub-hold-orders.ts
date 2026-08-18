import { createAdminClient } from "@/lib/supabase/admin";
import { roundMoneyDisplay } from "@/lib/format";
import {
  notifySuppliersOfDispatchOrders,
  type SupplierDispatchNotifyPayload,
} from "@/lib/dropship/notify-supplier-dispatch";
import {
  HUB_COLLECTION_BUYER_NAME,
  HUB_COLLECTION_CARRIER,
  HUB_COLLECTION_NOTES,
} from "@/lib/dropship/hub-collection";
import type { OrderLineItem } from "@/lib/orders/types";

type HubHoldResult = { error?: string; created: number; notified: number };

/**
 * Al aprobar el pago del cliente, crea (si falta) el pedido de acopio
 * para cada proveedor involucrado y le avisa solo los productos a apartar.
 * No incluye datos de pago ni PII del cliente final.
 */
export async function ensureHubHoldOrdersForCatalogOrder(input: {
  catalogOrderId: string;
  storeId: string;
  merchantUserId: string;
  storeName: string;
  items: OrderLineItem[];
}): Promise<HubHoldResult> {
  const dropshipLines = input.items.filter(
    (item) =>
      typeof item.supplier_product_id === "string" &&
      item.supplier_product_id.trim(),
  );
  if (dropshipLines.length === 0) {
    return { created: 0, notified: 0 };
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  const supplierProductIds = [
    ...new Set(
      dropshipLines.map((item) => String(item.supplier_product_id).trim()),
    ),
  ];

  const { data: products, error: productsError } = await client
    .from("supplier_products")
    .select("id, created_by, title, base_price_usd")
    .in("id", supplierProductIds);

  if (productsError) return { error: productsError.message, created: 0, notified: 0 };

  const productById = new Map<
    string,
    { created_by: string; title: string; base_price_usd: number }
  >();
  for (const row of (products as Record<string, unknown>[] | null) ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    const createdBy =
      typeof row.created_by === "string" ? row.created_by : "";
    if (!id || !createdBy) continue;
    productById.set(id, {
      created_by: createdBy,
      title: String(row.title ?? "Producto"),
      base_price_usd: Number(row.base_price_usd) || 0,
    });
  }

  type Group = {
    supplierUserId: string;
    lines: Array<{
      supplierProductId: string;
      productTitle: string;
      quantity: number;
      unitCostUsd: number;
    }>;
  };
  const groups = new Map<string, Group>();

  for (const item of dropshipLines) {
    const supplierProductId = String(item.supplier_product_id).trim();
    const product = productById.get(supplierProductId);
    if (!product) continue;
    const quantity = Math.max(
      1,
      Math.floor(Number(item.stock_units ?? item.quantity) || 1),
    );
    const unitCostUsd =
      item.unit_cost_usd != null && Number.isFinite(Number(item.unit_cost_usd))
        ? Number(item.unit_cost_usd)
        : product.base_price_usd;
    const group = groups.get(product.created_by) ?? {
      supplierUserId: product.created_by,
      lines: [],
    };
    group.lines.push({
      supplierProductId,
      productTitle: item.product_name || product.title,
      quantity,
      unitCostUsd,
    });
    groups.set(product.created_by, group);
  }

  if (groups.size === 0) {
    return { created: 0, notified: 0 };
  }

  const now = new Date().toISOString();
  const senderName = input.storeName.trim() || "Tienda Alcéntimo";
  const notifyPayloads: SupplierDispatchNotifyPayload[] = [];
  let created = 0;

  for (const group of groups.values()) {
    const totalUsd = roundMoneyDisplay(
      group.lines.reduce(
        (sum, line) => sum + line.unitCostUsd * line.quantity,
        0,
      ),
    );

    const { data: existing } = await client
      .from("supplier_orders")
      .select("id, dispatch_notified_at")
      .eq("source_catalog_order_id", input.catalogOrderId)
      .eq("supplier_user_id", group.supplierUserId)
      .maybeSingle();

    let supplierOrderId: string;
    let alreadyNotified = false;

    if (existing?.id) {
      supplierOrderId = String(existing.id);
      alreadyNotified = Boolean(existing.dispatch_notified_at);
    } else {
      const { data: inserted, error: insertError } = await client
        .from("supplier_orders")
        .insert({
          supplier_user_id: group.supplierUserId,
          merchant_user_id: input.merchantUserId,
          merchant_store_id: input.storeId,
          source_catalog_order_id: input.catalogOrderId,
          status: "pendiente",
          buyer_name: HUB_COLLECTION_BUYER_NAME,
          buyer_phone: null,
          buyer_address: null,
          shipping_carrier: HUB_COLLECTION_CARRIER,
          notes: HUB_COLLECTION_NOTES,
          total_usd: totalUsd,
          sender_name: senderName,
          updated_at: now,
        })
        .select("id")
        .single();

      if (insertError || !inserted?.id) {
        return {
          error:
            insertError?.message ??
            "No se pudo crear el aviso de acopio para el proveedor.",
          created,
          notified: 0,
        };
      }
      supplierOrderId = String(inserted.id);
      created += 1;

      const { error: itemsError } = await client.from("supplier_order_items").insert(
        group.lines.map((line) => ({
          order_id: supplierOrderId,
          product_id: line.supplierProductId,
          product_title: line.productTitle,
          quantity: line.quantity,
          unit_price_usd: line.unitCostUsd,
          unit_cost_usd: line.unitCostUsd,
          cost_locked_at: now,
          line_total_usd: roundMoneyDisplay(line.unitCostUsd * line.quantity),
        })),
      );
      if (itemsError) {
        return { error: itemsError.message, created, notified: 0 };
      }
    }

    notifyPayloads.push({
      supplierOrderId,
      supplierUserId: group.supplierUserId,
      alreadyNotified,
      senderName,
      shipOn: "",
      customerName: HUB_COLLECTION_BUYER_NAME,
      customerPhone: null,
      customerAddress: null,
      shippingCarrier: HUB_COLLECTION_CARRIER,
      shippingBranchName: null,
      shippingBranchAddress: null,
      items: group.lines.map((line) => ({
        productTitle: line.productTitle,
        quantity: line.quantity,
      })),
    });
  }

  try {
    await notifySuppliersOfDispatchOrders(notifyPayloads);
  } catch (error) {
    console.error("[ensureHubHoldOrdersForCatalogOrder] notify", error);
  }

  return { created, notified: notifyPayloads.length };
}
