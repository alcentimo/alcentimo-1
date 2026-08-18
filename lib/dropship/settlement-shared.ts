import { createAdminClient } from "@/lib/supabase/admin";
import { roundMoneyDisplay } from "@/lib/format";
import { computeAmountDueUsd } from "@/lib/dropship/settlement-math";
import {
  isSettlementEligibleOrderEstado,
  SETTLEMENT_ELIGIBLE_ORDER_ESTADOS,
  isDropshipSettlementStatus,
  isSupplierPayoutStatus,
  type DropshipSettlementLineView,
  type DropshipSettlementRecord,
  type DropshipSettlementShipmentView,
  type DropshipSettlementShippingView,
  type DropshipSettlementSupplierBreakdown,
  type SettlementBalanceEntryView,
  type SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";
import { parseSettlementShipping } from "@/lib/dropship/settlement-shipping";
import type { SupplierB2bPaymentMethodKey } from "@/lib/supplier/payment-types";

export function mapSettlementRecord(
  row: Record<string, unknown>,
  payouts: SupplierPayoutObligationView[] = [],
  ledger: SettlementBalanceEntryView[] = [],
  shipments: DropshipSettlementShipmentView[] = [],
): DropshipSettlementRecord {
  const statusRaw = String(row.status ?? "reported");
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    storeName: String(row.store_name ?? ""),
    merchantUserId: String(row.merchant_user_id),
    merchantEmail:
      typeof row.merchant_email === "string" && row.merchant_email.trim()
        ? row.merchant_email.trim()
        : null,
    businessDate: String(row.business_date ?? "").slice(0, 10),
    orderCount: Number(row.order_count) || 0,
    wholesaleCostUsd: Number(row.wholesale_cost_usd) || 0,
    platformMarkupUsd: Number(row.platform_markup_usd) || 0,
    markupPercent: Number(row.markup_percent) || 0,
    amountDueUsd: Number(row.amount_due_usd) || 0,
    status: isDropshipSettlementStatus(statusRaw) ? statusRaw : "reported",
    paymentMethod:
      typeof row.payment_method === "string" && row.payment_method.trim()
        ? (row.payment_method as SupplierB2bPaymentMethodKey)
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
    reportedAt: String(row.reported_at ?? row.created_at ?? ""),
    reviewedAt:
      typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    reviewedBy:
      typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    reviewNotes: String(row.review_notes ?? ""),
    payouts,
    ledger,
    shipments,
  };
}

export function mapPayoutRow(
  row: Record<string, unknown>,
): SupplierPayoutObligationView {
  const statusRaw = String(row.status ?? "scheduled");
  return {
    id: String(row.id),
    settlementId: String(row.settlement_id),
    supplierUserId: String(row.supplier_user_id),
    businessDate: String(row.business_date ?? "").slice(0, 10),
    shipOn: String(row.ship_on ?? "").slice(0, 10),
    amountUsd: Number(row.amount_usd) || 0,
    orderCount: Number(row.order_count) || 0,
    lineCount: Number(row.line_count) || 0,
    status: isSupplierPayoutStatus(statusRaw) ? statusRaw : "scheduled",
  };
}

export async function listLockedCatalogOrderIds(
  admin: ReturnType<typeof createAdminClient>,
  storeId: string,
  exceptSettlementId?: string,
): Promise<Set<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  let settlementQuery = client
    .from("dropship_daily_settlements")
    .select("id")
    .eq("store_id", storeId)
    .in("status", ["reported", "approved"]);

  if (exceptSettlementId) {
    settlementQuery = settlementQuery.neq("id", exceptSettlementId);
  }

  const { data: settlements, error } = await settlementQuery;
  if (error || !settlements?.length) return new Set();

  const ids = (settlements as Array<{ id?: string }>)
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string" && Boolean(id));
  if (ids.length === 0) return new Set();

  const { data: lines, error: linesError } = await client
    .from("dropship_daily_settlement_lines")
    .select("catalog_order_id")
    .in("settlement_id", ids);

  if (linesError) return new Set();

  const locked = new Set<string>();
  for (const row of (lines as Array<{ catalog_order_id?: string }> | null) ?? []) {
    if (typeof row.catalog_order_id === "string" && row.catalog_order_id) {
      locked.add(row.catalog_order_id);
    }
  }
  return locked;
}

export function extractDropshipLinesFromOrderItems(
  items: unknown,
): Array<{
  supplierProductId: string | null;
  productId: string | null;
  productTitle: string;
  quantity: number;
  unitCostUsd: number | null;
}> {
  if (!Array.isArray(items)) return [];
  const lines: Array<{
    supplierProductId: string | null;
    productId: string | null;
    productTitle: string;
    quantity: number;
    unitCostUsd: number | null;
  }> = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const supplierProductId =
      typeof row.supplier_product_id === "string"
        ? row.supplier_product_id.trim()
        : "";
    const productId =
      typeof row.product_id === "string" ? row.product_id.trim() : "";
    if (!supplierProductId && !productId) continue;
    const quantity = Math.floor(Number(row.quantity) || 0);
    if (quantity <= 0) continue;
    const unitCost =
      row.unit_cost_usd != null && Number.isFinite(Number(row.unit_cost_usd))
        ? Number(row.unit_cost_usd)
        : null;
    lines.push({
      supplierProductId: supplierProductId || null,
      productId: productId || null,
      productTitle: String(row.product_name ?? "Producto").slice(0, 200),
      quantity,
      unitCostUsd: unitCost,
    });
  }

  return lines;
}

export async function buildSettlementLinesForStore(input: {
  storeId: string;
  markupPercent: number;
  lockedOrderIds?: Set<string>;
}): Promise<{
  lines: DropshipSettlementLineView[];
  suppliers: DropshipSettlementSupplierBreakdown[];
  orderCount: number;
  wholesaleCostUsd: number;
  platformMarkupUsd: number;
  amountDueUsd: number;
}> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;

  const { data: orders, error } = await client
    .from("orders")
    .select(
      "id, items, estado, customer_name, customer_phone, fulfillment_type, shipping_method, shipping_branch_name, shipping_branch_address, delivery_address",
    )
    .eq("store_id", input.storeId)
    .in("estado", [...SETTLEMENT_ELIGIBLE_ORDER_ESTADOS]);

  if (error) {
    throw new Error(error.message);
  }

  const locked = input.lockedOrderIds ?? new Set<string>();
  const candidateOrders: Array<{
    id: string;
    shipping: DropshipSettlementShippingView | null;
    dropshipLines: ReturnType<typeof extractDropshipLinesFromOrderItems>;
  }> = [];

  for (const row of (orders as Array<{
    id?: string;
    items?: unknown;
    estado?: unknown;
    customer_name?: unknown;
    customer_phone?: unknown;
    fulfillment_type?: unknown;
    shipping_method?: unknown;
    shipping_branch_name?: unknown;
    shipping_branch_address?: unknown;
    delivery_address?: unknown;
  }> | null) ?? []) {
    const orderId = typeof row.id === "string" ? row.id : "";
    if (!orderId || locked.has(orderId)) continue;
    if (!isSettlementEligibleOrderEstado(row.estado)) continue;
    const dropshipLines = extractDropshipLinesFromOrderItems(row.items);
    if (dropshipLines.length === 0) continue;
    candidateOrders.push({
      id: orderId,
      shipping: parseSettlementShipping(row as Record<string, unknown>),
      dropshipLines,
    });
  }

  if (candidateOrders.length === 0) {
    return {
      lines: [],
      suppliers: [],
      orderCount: 0,
      wholesaleCostUsd: 0,
      platformMarkupUsd: 0,
      amountDueUsd: 0,
    };
  }

  const unresolvedProductIds = [
    ...new Set(
      candidateOrders.flatMap((order) =>
        order.dropshipLines
          .filter((line) => !line.supplierProductId && line.productId)
          .map((line) => line.productId as string),
      ),
    ),
  ];

  const linkByProductId = new Map<string, string>();
  if (unresolvedProductIds.length > 0) {
    const { data: linkRows, error: linkError } = await client
      .from("store_dropship_links")
      .select("product_id, supplier_product_id")
      .eq("store_id", input.storeId)
      .in("product_id", unresolvedProductIds);
    if (linkError) {
      throw new Error(linkError.message);
    }
    for (const row of (linkRows as Array<{
      product_id?: string;
      supplier_product_id?: string;
    }> | null) ?? []) {
      if (
        typeof row.product_id === "string" &&
        typeof row.supplier_product_id === "string" &&
        row.supplier_product_id
      ) {
        linkByProductId.set(row.product_id, row.supplier_product_id);
      }
    }
  }

  for (const order of candidateOrders) {
    for (const line of order.dropshipLines) {
      if (line.supplierProductId) continue;
      if (!line.productId) continue;
      const linked = linkByProductId.get(line.productId);
      if (linked) line.supplierProductId = linked;
    }
  }

  const supplierProductIds = [
    ...new Set(
      candidateOrders.flatMap((order) =>
        order.dropshipLines
          .map((line) => line.supplierProductId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  ];

  if (supplierProductIds.length === 0) {
    return {
      lines: [],
      suppliers: [],
      orderCount: 0,
      wholesaleCostUsd: 0,
      platformMarkupUsd: 0,
      amountDueUsd: 0,
    };
  }

  const { data: products, error: productsError } = await client
    .from("supplier_products")
    .select("id, created_by, title, base_price_usd")
    .in("id", supplierProductIds);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const productById = new Map<
    string,
    { created_by: string; title: string; base_price_usd: number }
  >();
  for (const row of (products as Array<{
    id?: string;
    created_by?: string;
    title?: string;
    base_price_usd?: unknown;
  }> | null) ?? []) {
    if (typeof row.id !== "string" || typeof row.created_by !== "string") {
      continue;
    }
    productById.set(row.id, {
      created_by: row.created_by,
      title: String(row.title ?? "Producto"),
      base_price_usd: Number(row.base_price_usd) || 0,
    });
  }

  const lines: DropshipSettlementLineView[] = [];
  const ordersWithLines = new Set<string>();

  for (const order of candidateOrders) {
    for (const raw of order.dropshipLines) {
      if (!raw.supplierProductId) continue;
      const product = productById.get(raw.supplierProductId);
      if (!product) continue;
      const unitCost = roundMoneyDisplay(
        raw.unitCostUsd != null ? raw.unitCostUsd : product.base_price_usd,
      );
      const wholesaleLine = roundMoneyDisplay(unitCost * raw.quantity);
      const priced = computeAmountDueUsd(wholesaleLine, input.markupPercent);
      lines.push({
        catalogOrderId: order.id,
        supplierUserId: product.created_by,
        supplierProductId: raw.supplierProductId,
        productTitle: raw.productTitle || product.title,
        quantity: raw.quantity,
        unitCostUsd: unitCost,
        platformMarkupUsd: priced.platformMarkupUsd,
        lineDueUsd: priced.amountDueUsd,
        supplierPayoutUsd: priced.wholesaleCostUsd,
        shipping: order.shipping,
      });
      ordersWithLines.add(order.id);
    }
  }

  const supplierMap = new Map<string, DropshipSettlementSupplierBreakdown>();
  const supplierOrders = new Map<string, Set<string>>();
  let wholesaleCostUsd = 0;
  let platformMarkupUsd = 0;

  for (const line of lines) {
    wholesaleCostUsd += line.supplierPayoutUsd;
    platformMarkupUsd += line.platformMarkupUsd;
    const current = supplierMap.get(line.supplierUserId) ?? {
      supplierUserId: line.supplierUserId,
      wholesaleCostUsd: 0,
      lineCount: 0,
      orderCount: 0,
    };
    current.wholesaleCostUsd = roundMoneyDisplay(
      current.wholesaleCostUsd + line.supplierPayoutUsd,
    );
    current.lineCount += 1;
    supplierMap.set(line.supplierUserId, current);

    const orderSet = supplierOrders.get(line.supplierUserId) ?? new Set();
    orderSet.add(line.catalogOrderId);
    supplierOrders.set(line.supplierUserId, orderSet);
  }

  for (const [supplierId, breakdown] of supplierMap) {
    breakdown.orderCount = supplierOrders.get(supplierId)?.size ?? 0;
  }

  wholesaleCostUsd = roundMoneyDisplay(wholesaleCostUsd);
  platformMarkupUsd = roundMoneyDisplay(platformMarkupUsd);

  return {
    lines,
    suppliers: Array.from(supplierMap.values()),
    orderCount: ordersWithLines.size,
    wholesaleCostUsd,
    platformMarkupUsd,
    amountDueUsd: roundMoneyDisplay(wholesaleCostUsd + platformMarkupUsd),
  };
}
