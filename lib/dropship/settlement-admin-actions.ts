"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { fulfillApprovedDailySettlement } from "@/lib/dropship/settlement-fulfillment";
import {
  isMissingPayoutProofColumnError,
  mapPayoutRow,
  mapSettlementRecord,
  SUPPLIER_PAYOUT_SELECT,
  SUPPLIER_PAYOUT_SELECT_LEGACY,
} from "@/lib/dropship/settlement-shared";
import { uploadDropshipSettlementProof } from "@/lib/dropship/settlement-storage";
import type { SupplierPayoutObligationView } from "@/lib/dropship/settlement-types";
import { listSettlementBalanceEntries } from "@/lib/dropship/settlement-ledger";
import { loadShipmentsBySettlementIds } from "@/lib/dropship/settlement-shipping-load";
import {
  applySupplierNamesToPayouts,
  loadSupplierBreakdownsBySettlementIds,
  loadSupplierDisplayNames,
  withLedgerPartyNames,
  withNamedSuppliers,
} from "@/lib/dropship/settlement-supplier-names";
import type { DropshipSettlementRecord } from "@/lib/dropship/settlement-types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { error: "No tienes permiso para gestionar liquidaciones." as const };
  }
  return { user };
}

const SETTLEMENT_SELECT =
  "id, store_id, store_name, merchant_user_id, merchant_email, business_date, order_count, wholesale_cost_usd, platform_markup_usd, markup_percent, amount_due_usd, status, payment_method, payment_reference, payment_proof_url, payment_notes, reported_at, reviewed_at, reviewed_by, review_notes, created_at";

export async function listDropshipDailySettlements(options?: {
  limit?: number;
}): Promise<ActionResult<{ settlements: DropshipSettlementRecord[] }>> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { error: auth.error };

  const limit = Math.min(200, Math.max(1, options?.limit ?? 80));
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;

  const { data, error } = await client
    .from("dropship_daily_settlements")
    .select(SETTLEMENT_SELECT)
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  const settlementIds = rows.map((row) => String(row.id));
  const payoutsBySettlement = new Map<string, ReturnType<typeof mapPayoutRow>[]>();
  const ledgerBySettlement = await listSettlementBalanceEntries(settlementIds);
  const shipmentsBySettlement = await loadShipmentsBySettlementIds(settlementIds);
  const suppliersBySettlement =
    await loadSupplierBreakdownsBySettlementIds(settlementIds);

  if (settlementIds.length > 0) {
    let { data: payoutRows, error: payoutSelectError } = await client
      .from("supplier_payout_obligations")
      .select(SUPPLIER_PAYOUT_SELECT)
      .in("settlement_id", settlementIds);
    if (
      payoutSelectError &&
      isMissingPayoutProofColumnError(payoutSelectError.message)
    ) {
      const fallback = await client
        .from("supplier_payout_obligations")
        .select(SUPPLIER_PAYOUT_SELECT_LEGACY)
        .in("settlement_id", settlementIds);
      payoutRows = fallback.data;
    }

    for (const row of (payoutRows as Record<string, unknown>[] | null) ?? []) {
      const settlementId = String(row.settlement_id);
      const list = payoutsBySettlement.get(settlementId) ?? [];
      list.push(mapPayoutRow(row));
      payoutsBySettlement.set(settlementId, list);
    }
  }

  const supplierIds = [
    ...new Set(
      [
        ...[...payoutsBySettlement.values()].flatMap((list) =>
          list.map((item) => item.supplierUserId),
        ),
        ...[...ledgerBySettlement.values()].flatMap((list) =>
          list
            .map((entry) => entry.partyUserId)
            .filter((id): id is string => Boolean(id)),
        ),
        ...[...suppliersBySettlement.values()].flatMap((list) =>
          list.map((item) => item.supplierUserId),
        ),
      ].filter(Boolean),
    ),
  ];
  const supplierNames = await loadSupplierDisplayNames(supplierIds);

  return {
    settlements: rows.map((row) => {
      const id = String(row.id);
      return mapSettlementRecord(
        row,
        applySupplierNamesToPayouts(
          payoutsBySettlement.get(id) ?? [],
          supplierNames,
        ),
        withLedgerPartyNames(ledgerBySettlement.get(id) ?? [], supplierNames),
        shipmentsBySettlement.get(id) ?? [],
        suppliersBySettlement.get(id) ?? [],
      );
    }),
  };
}

export async function approveDropshipDailySettlement(input: {
  settlementId: string;
  reviewNotes?: string;
}): Promise<ActionResult<{ settlement: DropshipSettlementRecord }>> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { error: auth.error };

  const settlementId = input.settlementId.trim();
  if (!settlementId) return { error: "Liquidación no válida." };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;

  const { data: row, error } = await client
    .from("dropship_daily_settlements")
    .select(SETTLEMENT_SELECT)
    .eq("id", settlementId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "No se encontró el reporte diario." };
  if (row.status === "approved") {
    return { error: "Este reporte ya está aprobado." };
  }
  if (row.status !== "reported") {
    return { error: "Solo puedes aprobar un pago reportado." };
  }

  const fulfilled = await fulfillApprovedDailySettlement({
    settlementId,
    businessDate: String(row.business_date).slice(0, 10),
    merchantUserId: String(row.merchant_user_id),
    storeId: String(row.store_id),
  });
  if (fulfilled.error) return { error: fulfilled.error };

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await client
    .from("dropship_daily_settlements")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: auth.user.id,
      review_notes: (input.reviewNotes ?? "").trim().slice(0, 1000),
      updated_at: now,
    })
    .eq("id", settlementId)
    .select(SETTLEMENT_SELECT)
    .single();

  if (updateError || !updated) {
    return { error: updateError?.message ?? "No se pudo aprobar el reporte." };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/liquidacion");
  revalidatePath("/proveedor/dashboard");

  const { data: payoutRows } = await client
    .from("supplier_payout_obligations")
    .select(SUPPLIER_PAYOUT_SELECT)
    .eq("settlement_id", settlementId);

  const ledgerBySettlement = await listSettlementBalanceEntries([settlementId]);
  const shipmentsBySettlement = await loadShipmentsBySettlementIds([
    settlementId,
  ]);
  const suppliersBySettlement = await loadSupplierBreakdownsBySettlementIds([
    settlementId,
  ]);
  const payouts = ((payoutRows as Record<string, unknown>[] | null) ?? []).map(
    mapPayoutRow,
  );
  const ledger = ledgerBySettlement.get(settlementId) ?? [];
  const suppliers = suppliersBySettlement.get(settlementId) ?? [];
  const supplierNames = await loadSupplierDisplayNames([
    ...payouts.map((item) => item.supplierUserId),
    ...suppliers.map((item) => item.supplierUserId),
    ...ledger
      .map((entry) => entry.partyUserId)
      .filter((id): id is string => Boolean(id)),
  ]);

  return {
    settlement: mapSettlementRecord(
      updated as Record<string, unknown>,
      applySupplierNamesToPayouts(payouts, supplierNames),
      withLedgerPartyNames(ledger, supplierNames),
      shipmentsBySettlement.get(settlementId) ?? [],
      withNamedSuppliers(suppliers, supplierNames),
    ),
  };
}

export async function rejectDropshipDailySettlement(input: {
  settlementId: string;
  reviewNotes: string;
}): Promise<ActionResult<{ settlement: DropshipSettlementRecord }>> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { error: auth.error };

  const settlementId = input.settlementId.trim();
  const notes = input.reviewNotes.trim();
  if (!settlementId) return { error: "Liquidación no válida." };
  if (notes.length < 4) {
    return { error: "Indica el motivo del rechazo (mínimo 4 caracteres)." };
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;

  const { data: row, error } = await client
    .from("dropship_daily_settlements")
    .select("id, status")
    .eq("id", settlementId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "No se encontró el reporte diario." };
  if (row.status === "approved") {
    return { error: "No puedes rechazar un cierre ya aprobado." };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await client
    .from("dropship_daily_settlements")
    .update({
      status: "rejected",
      reviewed_at: now,
      reviewed_by: auth.user.id,
      review_notes: notes.slice(0, 1000),
      updated_at: now,
    })
    .eq("id", settlementId)
    .select(SETTLEMENT_SELECT)
    .single();

  if (updateError || !updated) {
    return { error: updateError?.message ?? "No se pudo rechazar el reporte." };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/liquidacion");

  const shipmentsBySettlement = await loadShipmentsBySettlementIds([
    settlementId,
  ]);
  const suppliersBySettlement = await loadSupplierBreakdownsBySettlementIds([
    settlementId,
  ]);
  const suppliers = suppliersBySettlement.get(settlementId) ?? [];
  const supplierNames = await loadSupplierDisplayNames(
    suppliers.map((item) => item.supplierUserId),
  );

  return {
    settlement: mapSettlementRecord(
      updated as Record<string, unknown>,
      [],
      [],
      shipmentsBySettlement.get(settlementId) ?? [],
      withNamedSuppliers(suppliers, supplierNames),
    ),
  };
}

export async function markSupplierPayoutPaid(
  formData: FormData,
): Promise<ActionResult<{ payout: SupplierPayoutObligationView }>> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { error: auth.error };

  const payoutId = String(formData.get("payoutId") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paymentReference = String(formData.get("paymentReference") ?? "").trim();
  const proofFile = formData.get("proofImage");
  if (!payoutId) return { error: "Liquidación no válida." };
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { error: "Adjunta el capture del pago al proveedor." };
  }

  const uploaded = await uploadDropshipSettlementProof(auth.user.id, proofFile);
  if (uploaded.error || !uploaded.url) {
    return { error: uploaded.error ?? "No se pudo subir el comprobante." };
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  const now = new Date().toISOString();

  const { data: updated, error } = await client
    .from("supplier_payout_obligations")
    .update({
      status: "paid",
      payment_proof_url: uploaded.url,
      payment_method: paymentMethod || null,
      payment_reference: paymentReference || null,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", payoutId)
    .select(SUPPLIER_PAYOUT_SELECT)
    .single();

  if (error || !updated) {
    return {
      error: error?.message?.includes("payment_proof_url")
        ? "Falta aplicar la migración de comprobantes de liquidación."
        : (error?.message ?? "No se pudo marcar la liquidación como pagada."),
    };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/proveedor/dashboard");
  revalidatePath("/proveedor/dashboard/hub/pagos");

  const payout = mapPayoutRow(updated as Record<string, unknown>);
  const names = await loadSupplierDisplayNames([payout.supplierUserId]);
  return {
    payout: applySupplierNamesToPayouts([payout], names)[0] ?? payout,
  };
}
