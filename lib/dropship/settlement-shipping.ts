import { roundMoneyDisplay } from "@/lib/format";
import {
  getOrderFulfillmentLabel,
  getOrderShippingMethodLabel,
} from "@/lib/orders/shipping-display";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";
import type {
  DropshipSettlementLineView,
  DropshipSettlementShipmentView,
  DropshipSettlementShippingView,
} from "@/lib/dropship/settlement-types";

export const SETTLEMENT_LINE_SELECT =
  "settlement_id, catalog_order_id, supplier_user_id, supplier_product_id, product_title, quantity, unit_cost_usd, platform_markup_usd, line_due_usd, supplier_payout_usd, customer_name, customer_phone, fulfillment_type, shipping_method, shipping_branch_name, shipping_branch_address, delivery_address";

export const SETTLEMENT_LINE_SELECT_LEGACY =
  "settlement_id, catalog_order_id, supplier_user_id, supplier_product_id, product_title, quantity, unit_cost_usd, platform_markup_usd, line_due_usd, supplier_payout_usd";

function optionalText(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

export function parseSettlementShipping(
  row: Record<string, unknown>,
): DropshipSettlementShippingView | null {
  const customerName = optionalText(row.customer_name, 160) ?? "";
  const customerPhone = optionalText(row.customer_phone, 40);
  const fulfillmentType = optionalText(row.fulfillment_type, 40);
  const shippingMethod = optionalText(row.shipping_method, 40);
  const shippingBranchName = optionalText(row.shipping_branch_name, 160);
  const shippingBranchAddress = optionalText(row.shipping_branch_address, 240);
  const deliveryAddress = optionalText(row.delivery_address, 240);

  if (
    !customerName &&
    !customerPhone &&
    !fulfillmentType &&
    !shippingMethod &&
    !shippingBranchName &&
    !shippingBranchAddress &&
    !deliveryAddress
  ) {
    return null;
  }

  const shipping = {
    customerName: customerName || "Cliente",
    customerPhone,
    fulfillmentType,
    shippingMethod,
    shippingMethodLabel: getOrderShippingMethodLabel({
      shipping_method: shippingMethod,
    }),
    shippingBranchName,
    shippingBranchAddress,
    deliveryAddress,
    fulfillmentLabel: getOrderFulfillmentLabel({
      fulfillment_type: fulfillmentType as
        | "delivery"
        | "pickup"
        | "shipping"
        | null,
      delivery_address: deliveryAddress,
    }),
    destinationLabel: formatShippingDestination({
      shippingMethod,
      shippingBranchName,
      shippingBranchAddress,
      deliveryAddress,
      fulfillmentType,
    }),
  } satisfies DropshipSettlementShippingView;

  return shipping;
}

export function formatShippingDestination(input: {
  shippingMethod?: string | null;
  shippingBranchName?: string | null;
  shippingBranchAddress?: string | null;
  deliveryAddress?: string | null;
  fulfillmentType?: string | null;
}): string {
  const method = input.shippingMethod?.trim() || null;
  const branchName = input.shippingBranchName?.trim() || null;
  const branchAddress = input.shippingBranchAddress?.trim() || null;
  const delivery = input.deliveryAddress?.trim() || null;
  const methodLabel = getOrderShippingMethodLabel({ shipping_method: method });

  if (isNationalCarrierKey(method)) {
    const parts = [methodLabel ?? method];
    if (branchName) parts.push(branchName);
    if (branchAddress) parts.push(branchAddress);
    return parts.join(" · ");
  }

  if (delivery) {
    return methodLabel ? `${methodLabel} · ${delivery}` : delivery;
  }

  if (methodLabel) return methodLabel;
  if (input.fulfillmentType === "pickup") return "Retiro coordinado";
  return "Sin destino registrado";
}

export function shippingToLineInsert(
  shipping: DropshipSettlementShippingView | null,
): {
  customer_name: string;
  customer_phone: string | null;
  fulfillment_type: string | null;
  shipping_method: string | null;
  shipping_branch_name: string | null;
  shipping_branch_address: string | null;
  delivery_address: string | null;
} {
  return {
    customer_name: shipping?.customerName?.slice(0, 160) ?? "",
    customer_phone: shipping?.customerPhone?.slice(0, 40) ?? null,
    fulfillment_type: shipping?.fulfillmentType?.slice(0, 40) ?? null,
    shipping_method: shipping?.shippingMethod?.slice(0, 40) ?? null,
    shipping_branch_name: shipping?.shippingBranchName?.slice(0, 160) ?? null,
    shipping_branch_address:
      shipping?.shippingBranchAddress?.slice(0, 240) ?? null,
    delivery_address: shipping?.deliveryAddress?.slice(0, 240) ?? null,
  };
}

export function mapSettlementLineRow(
  row: Record<string, unknown>,
): DropshipSettlementLineView {
  return {
    catalogOrderId: String(row.catalog_order_id ?? ""),
    supplierUserId: String(row.supplier_user_id ?? ""),
    supplierProductId:
      typeof row.supplier_product_id === "string"
        ? row.supplier_product_id
        : null,
    productTitle: String(row.product_title ?? ""),
    quantity: Number(row.quantity) || 0,
    unitCostUsd: Number(row.unit_cost_usd) || 0,
    platformMarkupUsd: Number(row.platform_markup_usd) || 0,
    lineDueUsd: Number(row.line_due_usd) || 0,
    supplierPayoutUsd: Number(row.supplier_payout_usd) || 0,
    shipping: parseSettlementShipping(row),
  };
}

export function groupSettlementShipments(
  lines: DropshipSettlementLineView[],
): DropshipSettlementShipmentView[] {
  const byOrder = new Map<string, DropshipSettlementShipmentView>();

  for (const line of lines) {
    const orderId = line.catalogOrderId || `line-${line.productTitle}`;
    const current = byOrder.get(orderId);
    if (current) {
      current.quantity += line.quantity;
      current.lineDueUsd = roundMoneyDisplay(
        current.lineDueUsd + line.lineDueUsd,
      );
      if (!current.productTitles.includes(line.productTitle)) {
        current.productTitles.push(line.productTitle);
      }
      if (!current.shipping && line.shipping) {
        current.shipping = line.shipping;
      }
      continue;
    }

    byOrder.set(orderId, {
      catalogOrderId: line.catalogOrderId,
      productTitles: [line.productTitle],
      quantity: line.quantity,
      lineDueUsd: line.lineDueUsd,
      shipping: line.shipping,
    });
  }

  return Array.from(byOrder.values());
}

