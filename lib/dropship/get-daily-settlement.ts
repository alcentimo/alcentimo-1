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
      existing.payouts = (
        (payoutRows as Record<string, unknown>[] | null) ?? []
      ).map(mapPayoutRow);

      const { data: lineRows } = await client
        .from("dropship_daily_settlement_lines")
        .select(
          "catalog_order_id, supplier_user_id, supplier_product_id, product_title, quantity, unit_cost_usd, platform_markup_usd, line_due_usd, supplier_payout_usd",
        )
        .eq("settlement_id", existing.id);

      const lines = (
        (lineRows as Record<string, unknown>[] | null) ?? []
      ).map((row) => ({
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
      }));

      const supplierMap = new Map<
        string,
        { wholesaleCostUsd: number; lineCount: number; orders: Set<string> }
      >();
      for (const line of lines) {
        const current = supplierMap.get(line.supplierUserId) ?? {
          wholesaleCostUsd: 0,
          lineCount: 0,
          orders: new Set<string>(),
        };
        current.wholesaleCostUsd += line.supplierPayoutUsd;
        current.lineCount += 1;
        if (line.catalogOrderId) current.orders.add(line.catalogOrderId);
        supplierMap.set(line.supplierUserId, current);
      }

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
