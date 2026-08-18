import { createAdminClient } from "@/lib/supabase/admin";
import { roundMoneyDisplay } from "@/lib/format";
import type { SettlementBalanceEntryView } from "@/lib/dropship/settlement-types";

export function platformSettlementAccountKey(): string {
  return "platform";
}

export function supplierSettlementAccountKey(supplierUserId: string): string {
  return `supplier:${supplierUserId}`;
}

export function mapBalanceEntryRow(
  row: Record<string, unknown>,
): SettlementBalanceEntryView {
  const partyKindRaw = String(row.party_kind ?? "supplier");
  return {
    id: String(row.id),
    settlementId: String(row.settlement_id),
    accountKey: String(row.account_key ?? ""),
    partyKind: partyKindRaw === "platform" ? "platform" : "supplier",
    partyUserId:
      typeof row.party_user_id === "string" && row.party_user_id
        ? row.party_user_id
        : null,
    partyName: null,
    amountUsd: Number(row.amount_usd) || 0,
    description: String(row.description ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

const BALANCE_SELECT =
  "id, settlement_id, account_key, party_kind, party_user_id, amount_usd, description, created_at";

export async function postApprovedSettlementBalances(input: {
  settlementId: string;
  businessDate: string;
  platformMarkupUsd: number;
  supplierCredits: Array<{ supplierUserId: string; amountUsd: number }>;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;

  const rows: Array<{
    settlement_id: string;
    account_key: string;
    party_kind: "platform" | "supplier";
    party_user_id: string | null;
    amount_usd: number;
    currency: string;
    description: string;
  }> = [
    {
      settlement_id: input.settlementId,
      account_key: platformSettlementAccountKey(),
      party_kind: "platform",
      party_user_id: null,
      amount_usd: roundMoneyDisplay(input.platformMarkupUsd),
      currency: "USD",
      description: `Comisión Alcéntimo · liquidación ${input.businessDate}`,
    },
    ...input.supplierCredits
      .filter((credit) => credit.supplierUserId)
      .map((credit) => ({
        settlement_id: input.settlementId,
        account_key: supplierSettlementAccountKey(credit.supplierUserId),
        party_kind: "supplier" as const,
        party_user_id: credit.supplierUserId,
        amount_usd: roundMoneyDisplay(credit.amountUsd),
        currency: "USD",
        description: `Costo de producto · liquidación ${input.businessDate}`,
      })),
  ];

  const { error } = await client
    .from("settlement_balance_entries")
    .upsert(rows, { onConflict: "settlement_id,account_key" });

  if (error) return { error: error.message };
  return {};
}

export async function listSettlementBalanceEntries(
  settlementIds: string[],
): Promise<Map<string, SettlementBalanceEntryView[]>> {
  const bySettlement = new Map<string, SettlementBalanceEntryView[]>();
  if (settlementIds.length === 0) return bySettlement;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("settlement_balance_entries")
    .select(BALANCE_SELECT)
    .in("settlement_id", settlementIds);

  if (error) return bySettlement;

  for (const row of (data as Record<string, unknown>[] | null) ?? []) {
    const entry = mapBalanceEntryRow(row);
    const list = bySettlement.get(entry.settlementId) ?? [];
    list.push(entry);
    bySettlement.set(entry.settlementId, list);
  }
  return bySettlement;
}

export async function getSupplierCreditedBalanceUsd(
  supplierUserId: string,
): Promise<number> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("settlement_balance_entries")
    .select("amount_usd")
    .eq("party_kind", "supplier")
    .eq("party_user_id", supplierUserId);

  if (error) return 0;

  let total = 0;
  for (const row of (data as Array<{ amount_usd?: unknown }> | null) ?? []) {
    total += Number(row.amount_usd) || 0;
  }
  return roundMoneyDisplay(total);
}
