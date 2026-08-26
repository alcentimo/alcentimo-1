import { createAdminClient } from "@/lib/supabase/admin";
import { roundMoneyDisplay } from "@/lib/format";
import { addDaysToBusinessDate } from "@/lib/dropship/settlement-date";
import { postApprovedSettlementBalances } from "@/lib/dropship/settlement-ledger";
import {
  notifySuppliersOfDispatchOrders,
  type SupplierDispatchNotifyPayload,
} from "@/lib/dropship/notify-supplier-dispatch";
import { parseSettlementShipping } from "@/lib/dropship/settlement-shipping";
import type { DropshipSettlementShippingView } from "@/lib/dropship/settlement-types";
import {
  HUB_COLLECTION_BUYER_NAME,
  HUB_COLLECTION_CARRIER,
  HUB_COLLECTION_NOTES,
} from "@/lib/dropship/hub-collection";

type SettlementLineRow = {
  catalog_order_id: string | null;
  supplier_user_id: string;
  supplier_product_id: string | null;
  product_title: string;
  quantity: number;
  unit_cost_usd: number;
  supplier_payout_usd: number;
  platform_markup_usd: number;
  shipping: DropshipSettlementShippingView | null;
};

function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/**
 * Crea obligaciones de pago a mayoristas, registra saldos y avisa al proveedor
 * para apartar stock. Copia el destino del cliente final a la etiqueta de acopio.
 */
export async function fulfillApprovedDailySettlement(input: {
  settlementId: string;
  businessDate: string;
  merchantUserId: string;
  storeId: string;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  const shipOn = addDaysToBusinessDate(input.businessDate, 1);
  const now = new Date().toISOString();

  const { data: storeRow } = await client
    .from("stores")
    .select("name")
    .eq("id", input.storeId)
    .maybeSingle();
  const senderName =
    optionalText(storeRow?.name, 160) ?? "Tienda Alcéntimo";

  let { data: lineRows, error: linesError } = await client
    .from("dropship_daily_settlement_lines")
    .select(
      "catalog_order_id, supplier_user_id, supplier_product_id, product_title, quantity, unit_cost_usd, supplier_payout_usd, platform_markup_usd, customer_name, customer_document_id, customer_phone, fulfillment_type, shipping_method, shipping_branch_name, shipping_branch_address, delivery_address",
    )
    .eq("settlement_id", input.settlementId);

  if (linesError) {
    const fallback = await client
      .from("dropship_daily_settlement_lines")
      .select(
        "catalog_order_id, supplier_user_id, supplier_product_id, product_title, quantity, unit_cost_usd, supplier_payout_usd, platform_markup_usd, customer_name, customer_phone, fulfillment_type, shipping_method, shipping_branch_name, shipping_branch_address, delivery_address",
      )
      .eq("settlement_id", input.settlementId);
    lineRows = fallback.data;
    linesError = fallback.error;
  }

  if (linesError) return { error: linesError.message };

  const lines: SettlementLineRow[] = (
    (lineRows as Record<string, unknown>[] | null) ?? []
  ).map((row) => ({
    catalog_order_id:
      typeof row.catalog_order_id === "string" ? row.catalog_order_id : null,
    supplier_user_id: String(row.supplier_user_id ?? ""),
    supplier_product_id:
      typeof row.supplier_product_id === "string" ? row.supplier_product_id : null,
    product_title: String(row.product_title ?? "Producto"),
    quantity: Number(row.quantity) || 0,
    unit_cost_usd: Number(row.unit_cost_usd) || 0,
    supplier_payout_usd: Number(row.supplier_payout_usd) || 0,
    platform_markup_usd: Number(row.platform_markup_usd) || 0,
    shipping: parseSettlementShipping(row),
  }));

  const groups = new Map<
    string,
    {
      catalogOrderId: string;
      supplierUserId: string;
      lines: SettlementLineRow[];
    }
  >();

  for (const line of lines) {
    if (!line.catalog_order_id || !line.supplier_user_id || line.quantity <= 0) {
      continue;
    }
    const key = `${line.catalog_order_id}:${line.supplier_user_id}`;
    const group = groups.get(key) ?? {
      catalogOrderId: line.catalog_order_id,
      supplierUserId: line.supplier_user_id,
      lines: [],
    };
    group.lines.push(line);
    groups.set(key, group);
  }

  const notifyPayloads: SupplierDispatchNotifyPayload[] = [];

  for (const group of groups.values()) {
    const totalUsd = roundMoneyDisplay(
      group.lines.reduce((sum, line) => sum + line.supplier_payout_usd, 0),
    );
    const shipping = group.lines.find((line) => line.shipping)?.shipping ?? null;
    const customerName =
      shipping?.customerName?.trim() || HUB_COLLECTION_BUYER_NAME;
    const customerPhone = shipping?.customerPhone ?? null;
    const customerAddress =
      shipping?.destinationLabel &&
      shipping.destinationLabel !== "Sin destino registrado"
        ? shipping.destinationLabel
        : (shipping?.deliveryAddress ?? null);
    const shippingCarrier =
      shipping?.shippingMethod?.trim() || HUB_COLLECTION_CARRIER;
    const shippingBranchName = shipping?.shippingBranchName ?? null;
    const shippingBranchAddress = shipping?.shippingBranchAddress ?? null;
    const buyerDocumentId = shipping?.customerDocumentId ?? null;

    const { data: existing } = await client
      .from("supplier_orders")
      .select("id, dispatch_notified_at")
      .eq("source_catalog_order_id", group.catalogOrderId)
      .eq("supplier_user_id", group.supplierUserId)
      .maybeSingle();

    const orderPatch = {
      settlement_id: input.settlementId,
      ship_on: shipOn,
      payment_status: "reportado",
      total_usd: totalUsd,
      sender_name: senderName,
      buyer_name: customerName,
      buyer_document_id: buyerDocumentId,
      buyer_phone: customerPhone,
      buyer_address: customerAddress,
      shipping_carrier: shippingCarrier,
      shipping_branch_name: shippingBranchName,
      shipping_branch_address: shippingBranchAddress,
      notes: `${HUB_COLLECTION_NOTES} Destino del paquete: ${customerName}${buyerDocumentId ? ` · CI ${buyerDocumentId}` : ""}${customerPhone ? ` · ${customerPhone}` : ""}${customerAddress ? ` · ${customerAddress}` : ""}. Liquidación ${input.businessDate}. Recolección a partir del ${shipOn}.`,
      updated_at: now,
    };

    let supplierOrderId: string;
    let alreadyNotified = false;
    let notifyItems = group.lines.map((line) => ({
      productTitle: line.product_title,
      quantity: line.quantity,
    }));

    if (existing?.id) {
      supplierOrderId = String(existing.id);
      alreadyNotified = Boolean(existing.dispatch_notified_at);
      let { error: updateError } = await client
        .from("supplier_orders")
        .update(orderPatch)
        .eq("id", supplierOrderId);
      if (updateError && /buyer_document_id/i.test(updateError.message)) {
        const { buyer_document_id, ...withoutDocument } = orderPatch;
        void buyer_document_id;
        ({ error: updateError } = await client
          .from("supplier_orders")
          .update(withoutDocument)
          .eq("id", supplierOrderId));
      }
      if (updateError) return { error: updateError.message };

      const { data: existingItems } = await client
        .from("supplier_order_items")
        .select("product_title, quantity")
        .eq("order_id", supplierOrderId);
      const loaded = (existingItems as Record<string, unknown>[] | null) ?? [];
      if (loaded.length > 0) {
        notifyItems = loaded.map((item) => ({
          productTitle: String(item.product_title ?? "Producto"),
          quantity: Number(item.quantity) || 0,
        }));
      }
    } else {
      const insertPayload = {
        supplier_user_id: group.supplierUserId,
        merchant_user_id: input.merchantUserId,
        merchant_store_id: input.storeId,
        source_catalog_order_id: group.catalogOrderId,
        status: "pendiente",
        ...orderPatch,
      };
      let { data: created, error: createError } = await client
        .from("supplier_orders")
        .insert(insertPayload)
        .select("id")
        .single();
      if (createError && /buyer_document_id/i.test(createError.message)) {
        const { buyer_document_id, ...withoutDocument } = insertPayload;
        void buyer_document_id;
        ({ data: created, error: createError } = await client
          .from("supplier_orders")
          .insert(withoutDocument)
          .select("id")
          .single());
      }

      if (createError || !created?.id) {
        return {
          error:
            createError?.message ??
            "No se pudo crear el pedido del mayorista.",
        };
      }
      supplierOrderId = String(created.id);

      const { error: itemsError } = await client.from("supplier_order_items").insert(
        group.lines.map((line) => {
          const qty = Math.max(1, Number(line.quantity) || 1);
          const supplierUnit = roundMoneyDisplay(
            Number(line.supplier_payout_usd) / qty,
          );
          return {
            order_id: supplierOrderId,
            product_id: line.supplier_product_id,
            product_title: line.product_title,
            quantity: line.quantity,
            unit_price_usd: supplierUnit,
            unit_cost_usd: supplierUnit,
            cost_locked_at: now,
            line_total_usd: line.supplier_payout_usd,
          };
        }),
      );
      if (itemsError) return { error: itemsError.message };
    }

    notifyPayloads.push({
      supplierOrderId,
      supplierUserId: group.supplierUserId,
      alreadyNotified,
      senderName,
      shipOn,
      customerName,
      customerPhone,
      customerAddress,
      customerDocumentId: buyerDocumentId,
      shippingCarrier,
      shippingBranchName,
      shippingBranchAddress,
      items: notifyItems,
    });
  }

  const payoutBySupplier = new Map<
    string,
    { amountUsd: number; orderIds: Set<string>; lineCount: number }
  >();
  let platformMarkupUsd = 0;
  for (const line of lines) {
    if (!line.supplier_user_id) continue;
    platformMarkupUsd += line.platform_markup_usd;
    const current = payoutBySupplier.get(line.supplier_user_id) ?? {
      amountUsd: 0,
      orderIds: new Set<string>(),
      lineCount: 0,
    };
    current.amountUsd = roundMoneyDisplay(
      current.amountUsd + line.supplier_payout_usd,
    );
    current.lineCount += 1;
    if (line.catalog_order_id) current.orderIds.add(line.catalog_order_id);
    payoutBySupplier.set(line.supplier_user_id, current);
  }
  platformMarkupUsd = roundMoneyDisplay(platformMarkupUsd);

  const payoutRows = Array.from(payoutBySupplier.entries()).map(
    ([supplierUserId, value]) => ({
      settlement_id: input.settlementId,
      supplier_user_id: supplierUserId,
      business_date: input.businessDate,
      ship_on: shipOn,
      amount_usd: value.amountUsd,
      order_count: value.orderIds.size,
      line_count: value.lineCount,
      status: "scheduled",
      updated_at: now,
    }),
  );

  if (payoutRows.length > 0) {
    const { error: payoutError } = await client
      .from("supplier_payout_obligations")
      .upsert(payoutRows, { onConflict: "settlement_id,supplier_user_id" });
    if (payoutError) return { error: payoutError.message };
  }

  const posted = await postApprovedSettlementBalances({
    settlementId: input.settlementId,
    businessDate: input.businessDate,
    platformMarkupUsd,
    supplierCredits: Array.from(payoutBySupplier.entries()).map(
      ([supplierUserId, value]) => ({
        supplierUserId,
        amountUsd: value.amountUsd,
      }),
    ),
  });
  if (posted.error) return { error: posted.error };

  try {
    await notifySuppliersOfDispatchOrders(notifyPayloads);
  } catch (error) {
    console.error("[fulfillApprovedDailySettlement] notify", error);
  }

  return {};
}
