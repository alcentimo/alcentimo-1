import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DropshipSettlementLineView,
  DropshipSettlementShipmentView,
  DropshipSettlementShippingView,
} from "@/lib/dropship/settlement-types";
import {
  groupSettlementShipments,
  mapSettlementLineRow,
  mergeSettlementShipping,
  parseSettlementShipping,
  SETTLEMENT_LINE_SELECT,
  SETTLEMENT_LINE_SELECT_LEGACY,
  SETTLEMENT_LINE_SELECT_NO_DOCUMENT,
} from "@/lib/dropship/settlement-shipping";
import { loadSupplierDisplayNames } from "@/lib/dropship/settlement-supplier-names";

const ORDER_SHIPPING_SELECT =
  "id, store_id, customer_user_id, customer_name, customer_phone, fulfillment_type, shipping_method, shipping_branch_name, shipping_branch_address, delivery_address";

function optionalDocument(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 32);
  return trimmed.length >= 5 ? trimmed : null;
}

/** Completa la cédula del comprador desde customer_profiles (mutates shipping). */
export async function attachDocumentIdsToShipping(
  storeId: string,
  entries: Array<{
    orderId: string;
    shipping: DropshipSettlementShippingView | null;
  }>,
): Promise<void> {
  const missing = entries.filter(
    (entry) => entry.orderId && !entry.shipping?.customerDocumentId,
  );
  if (missing.length === 0) return;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  const orderIds = [...new Set(missing.map((entry) => entry.orderId))];

  const { data: orderRows, error } = await client
    .from("orders")
    .select("id, store_id, customer_user_id")
    .in("id", orderIds);
  if (error || !orderRows?.length) return;

  const userIds = [
    ...new Set(
      (orderRows as Array<{ customer_user_id?: string | null }>)
        .map((row) => row.customer_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (userIds.length === 0) return;

  const storeIds = [
    ...new Set(
      [
        storeId,
        ...(orderRows as Array<{ store_id?: string }>).map((row) => row.store_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: profiles } = await client
    .from("customer_profiles")
    .select("user_id, store_id, document_id")
    .in("user_id", userIds)
    .in("store_id", storeIds);

  const documentByUserStore = new Map<string, string>();
  for (const row of (profiles as Record<string, unknown>[] | null) ?? []) {
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    const profileStoreId = typeof row.store_id === "string" ? row.store_id : "";
    const documentId = optionalDocument(row.document_id);
    if (userId && profileStoreId && documentId) {
      documentByUserStore.set(`${profileStoreId}:${userId}`, documentId);
    }
  }

  const documentByOrderId = new Map<string, string>();
  for (const row of orderRows as Array<{
    id?: string;
    store_id?: string;
    customer_user_id?: string | null;
  }>) {
    const orderId = typeof row.id === "string" ? row.id : "";
    const orderStoreId = typeof row.store_id === "string" ? row.store_id : storeId;
    const userId = row.customer_user_id ?? "";
    if (!orderId || !userId) continue;
    const documentId =
      documentByUserStore.get(`${orderStoreId}:${userId}`) ?? null;
    if (documentId) documentByOrderId.set(orderId, documentId);
  }

  for (const entry of entries) {
    const documentId = documentByOrderId.get(entry.orderId);
    if (!documentId) continue;
    if (entry.shipping) {
      entry.shipping.customerDocumentId = documentId;
      continue;
    }
    entry.shipping = parseSettlementShipping({
      customer_name: "Cliente",
      customer_document_id: documentId,
    });
  }
}

export async function hydrateSettlementShippingFromOrders(
  lines: DropshipSettlementLineView[],
): Promise<DropshipSettlementLineView[]> {
  const orderIds = [
    ...new Set(lines.map((line) => line.catalogOrderId).filter(Boolean)),
  ];

  let next = lines;
  if (orderIds.length > 0) {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = admin as any;
    const { data, error } = await client
      .from("orders")
      .select(ORDER_SHIPPING_SELECT)
      .in("id", orderIds);

    if (!error && data) {
      const byId = new Map<string, DropshipSettlementShippingView>();
      for (const row of (data as Record<string, unknown>[] | null) ?? []) {
        const id = typeof row.id === "string" ? row.id : "";
        if (!id) continue;
        const shipping = parseSettlementShipping(row);
        if (shipping) byId.set(id, shipping);
      }

      next = lines.map((line) => {
        if (!line.catalogOrderId) return line;
        return {
          ...line,
          shipping: mergeSettlementShipping(
            line.shipping,
            byId.get(line.catalogOrderId) ?? null,
          ),
        };
      });
    }
  }

  const shippingEntries = next.map((line) => ({
    orderId: line.catalogOrderId,
    shipping: line.shipping,
  }));
  await attachDocumentIdsToShipping("", shippingEntries);
  return next.map((line, index) => ({
    ...line,
    shipping: shippingEntries[index]?.shipping ?? line.shipping,
  }));
}

/** @deprecated Usa hydrateSettlementShippingFromOrders (sincroniza todos los pedidos). */
export async function hydrateMissingSettlementShipping(
  lines: DropshipSettlementLineView[],
): Promise<DropshipSettlementLineView[]> {
  return hydrateSettlementShippingFromOrders(lines);
}

async function selectSettlementLineRows(
  settlementIds: string[],
): Promise<Record<string, unknown>[]> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;

  const full = await client
    .from("dropship_daily_settlement_lines")
    .select(SETTLEMENT_LINE_SELECT)
    .in("settlement_id", settlementIds);

  if (!full.error && full.data) {
    return (full.data as Record<string, unknown>[]) ?? [];
  }

  const withoutDocument = await client
    .from("dropship_daily_settlement_lines")
    .select(SETTLEMENT_LINE_SELECT_NO_DOCUMENT)
    .in("settlement_id", settlementIds);

  if (!withoutDocument.error && withoutDocument.data) {
    return (withoutDocument.data as Record<string, unknown>[]) ?? [];
  }

  const legacy = await client
    .from("dropship_daily_settlement_lines")
    .select(SETTLEMENT_LINE_SELECT_LEGACY)
    .in("settlement_id", settlementIds);

  if (legacy.error || !legacy.data) return [];
  return (legacy.data as Record<string, unknown>[]) ?? [];
}

export async function loadHydratedSettlementLines(
  settlementId: string,
): Promise<DropshipSettlementLineView[]> {
  const rows = await selectSettlementLineRows([settlementId]);
  const lines = await hydrateSettlementShippingFromOrders(
    rows.map(mapSettlementLineRow),
  );
  const names = await loadSupplierDisplayNames(
    lines.map((line) => line.supplierUserId),
  );
  return lines.map((line) => ({
    ...line,
    supplierName: names.get(line.supplierUserId) ?? line.supplierName ?? null,
  }));
}

export async function loadShipmentsBySettlementIds(
  settlementIds: string[],
): Promise<Map<string, DropshipSettlementShipmentView[]>> {
  const result = new Map<string, DropshipSettlementShipmentView[]>();
  if (settlementIds.length === 0) return result;

  const rows = await selectSettlementLineRows(settlementIds);
  const entries = rows.map((row) => ({
    settlementId: String(row.settlement_id ?? ""),
    line: mapSettlementLineRow(row),
  }));
  const hydrated = await hydrateSettlementShippingFromOrders(
    entries.map((entry) => entry.line),
  );
  const names = await loadSupplierDisplayNames(
    hydrated.map((line) => line.supplierUserId),
  );
  const linesBySettlement = new Map<string, DropshipSettlementLineView[]>();

  entries.forEach((entry, index) => {
    if (!entry.settlementId) return;
    const line = hydrated[index];
    if (!line) return;
    const list = linesBySettlement.get(entry.settlementId) ?? [];
    list.push({
      ...line,
      supplierName: names.get(line.supplierUserId) ?? line.supplierName ?? null,
    });
    linesBySettlement.set(entry.settlementId, list);
  });

  for (const [settlementId, lines] of linesBySettlement) {
    result.set(settlementId, groupSettlementShipments(lines));
  }

  return result;
}
