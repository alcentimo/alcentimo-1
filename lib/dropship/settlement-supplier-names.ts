import { createAdminClient } from "@/lib/supabase/admin";
import { roundMoneyDisplay } from "@/lib/format";
import type {
  DropshipSettlementSupplierBreakdown,
  SettlementBalanceEntryView,
  SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";

export function formatSupplierDisplayName(input: {
  companyName?: string | null;
  contactName?: string | null;
}): string | null {
  const company = input.companyName?.trim() ?? "";
  const contact = input.contactName?.trim() ?? "";
  return company || contact || null;
}

export async function loadSupplierDisplayNames(
  supplierUserIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const ids = [...new Set(supplierUserIds.filter(Boolean))];
  if (ids.length === 0) return names;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("supplier_profiles")
    .select("user_id, company_name, contact_name")
    .in("user_id", ids);

  for (const row of (data as Record<string, unknown>[] | null) ?? []) {
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    if (!userId) continue;
    const name = formatSupplierDisplayName({
      companyName:
        typeof row.company_name === "string" ? row.company_name : null,
      contactName:
        typeof row.contact_name === "string" ? row.contact_name : null,
    });
    if (name) names.set(userId, name);
  }

  return names;
}

export function withNamedSuppliers<
  T extends { supplierUserId: string; supplierName: string | null },
>(items: T[], names: Map<string, string>): T[] {
  return items.map((item) => ({
    ...item,
    supplierName:
      item.supplierName ?? names.get(item.supplierUserId) ?? null,
  }));
}

export function withLedgerPartyNames(
  entries: SettlementBalanceEntryView[],
  names: Map<string, string>,
): SettlementBalanceEntryView[] {
  return entries.map((entry) => ({
    ...entry,
    partyName:
      entry.partyKind === "platform"
        ? "Alcéntimo"
        : (entry.partyName ??
          (entry.partyUserId ? (names.get(entry.partyUserId) ?? null) : null)),
  }));
}

export async function loadSupplierBreakdownsBySettlementIds(
  settlementIds: string[],
): Promise<Map<string, DropshipSettlementSupplierBreakdown[]>> {
  const result = new Map<string, DropshipSettlementSupplierBreakdown[]>();
  if (settlementIds.length === 0) return result;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("dropship_daily_settlement_lines")
    .select("settlement_id, supplier_user_id, catalog_order_id, supplier_payout_usd")
    .in("settlement_id", settlementIds);

  if (error || !data) return result;

  const grouped = new Map<
    string,
    Map<
      string,
      { wholesaleCostUsd: number; lineCount: number; orders: Set<string> }
    >
  >();

  for (const row of (data as Record<string, unknown>[]) ?? []) {
    const settlementId = String(row.settlement_id ?? "");
    const supplierUserId = String(row.supplier_user_id ?? "");
    if (!settlementId || !supplierUserId) continue;
    const bySupplier = grouped.get(settlementId) ?? new Map();
    const current = bySupplier.get(supplierUserId) ?? {
      wholesaleCostUsd: 0,
      lineCount: 0,
      orders: new Set<string>(),
    };
    current.wholesaleCostUsd += Number(row.supplier_payout_usd) || 0;
    current.lineCount += 1;
    if (typeof row.catalog_order_id === "string" && row.catalog_order_id) {
      current.orders.add(row.catalog_order_id);
    }
    bySupplier.set(supplierUserId, current);
    grouped.set(settlementId, bySupplier);
  }

  const supplierIds = [
    ...new Set(
      [...grouped.values()].flatMap((bySupplier) => [...bySupplier.keys()]),
    ),
  ];
  const names = await loadSupplierDisplayNames(supplierIds);

  for (const [settlementId, bySupplier] of grouped) {
    result.set(
      settlementId,
      [...bySupplier.entries()].map(([supplierUserId, value]) => ({
        supplierUserId,
        supplierName: names.get(supplierUserId) ?? null,
        wholesaleCostUsd: roundMoneyDisplay(value.wholesaleCostUsd),
        lineCount: value.lineCount,
        orderCount: value.orders.size,
      })),
    );
  }

  return result;
}

export function applySupplierNamesToPayouts(
  payouts: SupplierPayoutObligationView[],
  names: Map<string, string>,
): SupplierPayoutObligationView[] {
  return withNamedSuppliers(payouts, names);
}
