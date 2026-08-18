"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { requireDropshipFeatureAccess } from "@/lib/dropship/feature-access";
import { getAlcentimoLocalDate } from "@/lib/analytics/page-visit-keys";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { normalizeMarkupPercent } from "@/lib/dropship/settlement-math";
import {
  buildSettlementLinesForStore,
  listLockedCatalogOrderIds,
  mapPayoutRow,
  mapSettlementRecord,
} from "@/lib/dropship/settlement-shared";
import { groupSettlementShipments } from "@/lib/dropship/settlement-shipping";
import { loadHydratedSettlementLines } from "@/lib/dropship/settlement-shipping-load";
import { loadSupplierDisplayNames } from "@/lib/dropship/settlement-supplier-names";
import type { DropshipDailySettlementSummary } from "@/lib/dropship/settlement-types";

export async function getDropshipDailySettlementSummary(): Promise<{
  error?: string;
  summary?: DropshipDailySettlementSummary;
}> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const feature = await requireDropshipFeatureAccess({
    email: auth.authUser.email,
  });
  if (!feature.ok) return { error: feature.error };

  const businessDate = getAlcentimoLocalDate();
  const platform = await fetchPlatformSettings();
  const markupPercent = normalizeMarkupPercent(
    platform.dropshipPlatformMarkupPercent,
  );

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = admin as any;

    const { data: existingRow } = await client
      .from("dropship_daily_settlements")
      .select(
        "id, store_id, store_name, merchant_user_id, merchant_email, business_date, order_count, wholesale_cost_usd, platform_markup_usd, markup_percent, amount_due_usd, status, payment_method, payment_reference, payment_proof_url, payment_notes, reported_at, reviewed_at, reviewed_by, review_notes, created_at",
      )
      .eq("store_id", auth.store.id)
      .eq("business_date", businessDate)
      .maybeSingle();

    const existing = existingRow
      ? mapSettlementRecord(existingRow as Record<string, unknown>)
      : null;

    if (existing?.status === "approved" || existing?.status === "reported") {
      const { data: payoutRows } = await client
        .from("supplier_payout_obligations")
        .select(
          "id, settlement_id, supplier_user_id, business_date, ship_on, amount_usd, order_count, line_count, status",
        )
        .eq("settlement_id", existing.id);
      const lines = await loadHydratedSettlementLines(existing.id);
      existing.payouts = (
        (payoutRows as Record<string, unknown>[] | null) ?? []
      ).map(mapPayoutRow);
      existing.shipments = groupSettlementShipments(lines);

      const supplierMap = new Map<
        string,
        {
          supplierName: string | null;
          wholesaleCostUsd: number;
          lineCount: number;
          orders: Set<string>;
        }
      >();
      for (const line of lines) {
        const current = supplierMap.get(line.supplierUserId) ?? {
          supplierName: null,
          wholesaleCostUsd: 0,
          lineCount: 0,
          orders: new Set<string>(),
        };
        current.wholesaleCostUsd += line.supplierPayoutUsd;
        current.lineCount += 1;
        if (line.catalogOrderId) current.orders.add(line.catalogOrderId);
        supplierMap.set(line.supplierUserId, current);
      }
      const supplierNames = await loadSupplierDisplayNames([
        ...supplierMap.keys(),
      ]);

      return {
        summary: {
          businessDate,
          storeId: auth.store.id,
          storeName: auth.store.name,
          markupPercent: existing.markupPercent,
          orderCount: existing.orderCount,
          lineCount: lines.length,
          wholesaleCostUsd: existing.wholesaleCostUsd,
          platformMarkupUsd: existing.platformMarkupUsd,
          amountDueUsd: existing.amountDueUsd,
          lines,
          suppliers: Array.from(supplierMap.entries()).map(
            ([supplierUserId, value]) => ({
              supplierUserId,
              supplierName: supplierNames.get(supplierUserId) ?? null,
              wholesaleCostUsd: value.wholesaleCostUsd,
              lineCount: value.lineCount,
              orderCount: value.orders.size,
            }),
          ),
          existing,
        },
      };
    }

    const locked = await listLockedCatalogOrderIds(admin, auth.store.id);
    const built = await buildSettlementLinesForStore({
      storeId: auth.store.id,
      markupPercent,
      lockedOrderIds: locked,
    });

    return {
      summary: {
        businessDate,
        storeId: auth.store.id,
        storeName: auth.store.name,
        markupPercent,
        orderCount: built.orderCount,
        lineCount: built.lines.length,
        wholesaleCostUsd: built.wholesaleCostUsd,
        platformMarkupUsd: built.platformMarkupUsd,
        amountDueUsd: built.amountDueUsd,
        lines: built.lines,
        suppliers: built.suppliers,
        existing,
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo calcular el cierre diario.",
    };
  }
}
