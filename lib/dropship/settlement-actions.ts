"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { requireDropshipFeatureAccess } from "@/lib/dropship/feature-access";
import { getAlcentimoLocalDate } from "@/lib/analytics/page-visit-keys";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { normalizeMarkupPercent } from "@/lib/dropship/settlement-math";
import { uploadDropshipSettlementProof } from "@/lib/dropship/settlement-storage";
import {
  buildSettlementLinesForStore,
  listLockedCatalogOrderIds,
  mapSettlementRecord,
} from "@/lib/dropship/settlement-shared";
import {
  groupSettlementShipments,
  shippingToLineInsert,
} from "@/lib/dropship/settlement-shipping";
import type { DropshipSettlementRecord } from "@/lib/dropship/settlement-types";
import { isSupplierB2bPaymentMethodKey } from "@/lib/supplier/payment-types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

async function requireMerchantDropshipStore() {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error } as const;

  const feature = await requireDropshipFeatureAccess({
    email: auth.authUser.email,
  });
  if (!feature.ok) return { error: feature.error } as const;

  return { user: auth.authUser, store: auth.store } as const;
}

export async function reportDropshipDailyPayment(formData: FormData): Promise<
  ActionResult<{ settlement: DropshipSettlementRecord }>
> {
  const gate = await requireMerchantDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { user, store } = gate;

  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "").trim();
  if (!isSupplierB2bPaymentMethodKey(paymentMethodRaw)) {
    return { error: "Selecciona un método de pago válido." };
  }

  const reference = String(formData.get("paymentReference") ?? "")
    .trim()
    .replace(/\s+/g, "");
  if (reference.length < 4) {
    return { error: "Ingresa una referencia de pago (mínimo 4 caracteres)." };
  }

  const notes = String(formData.get("paymentNotes") ?? "").trim().slice(0, 1000);
  const proofFile = formData.get("proofImage");

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
        "id, status, payment_proof_url, store_id, store_name, merchant_user_id, merchant_email, business_date, order_count, wholesale_cost_usd, platform_markup_usd, markup_percent, amount_due_usd, payment_method, payment_reference, payment_notes, reported_at, reviewed_at, reviewed_by, review_notes, created_at",
      )
      .eq("store_id", store.id)
      .eq("business_date", businessDate)
      .maybeSingle();

    const existingStatus =
      typeof existingRow?.status === "string" ? existingRow.status : null;
    if (existingStatus === "approved") {
      return {
        error: "Este cierre diario ya fue aprobado. No puedes reportar otro pago.",
      };
    }

    const exceptId =
      existingStatus === "reported" && typeof existingRow?.id === "string"
        ? String(existingRow.id)
        : undefined;
    const locked = await listLockedCatalogOrderIds(admin, store.id, exceptId);
    const built = await buildSettlementLinesForStore({
      storeId: store.id,
      markupPercent,
      lockedOrderIds: locked,
    });

    if (built.orderCount === 0 || built.amountDueUsd <= 0) {
      return {
        error:
          "No hay ventas confirmadas de mayoristas pendientes de liquidar hoy.",
      };
    }

    let proofUrl =
      typeof existingRow?.payment_proof_url === "string"
        ? existingRow.payment_proof_url
        : "";
    if (proofFile instanceof File && proofFile.size > 0) {
      const uploaded = await uploadDropshipSettlementProof(user.id, proofFile);
      if (uploaded.error || !uploaded.url) {
        return { error: uploaded.error ?? "No se pudo subir el comprobante." };
      }
      proofUrl = uploaded.url;
    }
    if (!proofUrl) {
      return { error: "Adjunta el comprobante de tu pago único del día." };
    }

    const now = new Date().toISOString();
    const payload = {
      store_id: store.id,
      merchant_user_id: user.id,
      business_date: businessDate,
      store_name: store.name,
      merchant_email: user.email ?? null,
      order_count: built.orderCount,
      wholesale_cost_usd: built.wholesaleCostUsd,
      platform_markup_usd: built.platformMarkupUsd,
      markup_percent: markupPercent,
      amount_due_usd: built.amountDueUsd,
      status: "reported",
      payment_method: paymentMethodRaw,
      payment_reference: reference.slice(0, 120),
      payment_proof_url: proofUrl,
      payment_notes: notes,
      reported_at: now,
      reviewed_at: null,
      reviewed_by: null,
      review_notes: "",
      updated_at: now,
    };

    let settlementId: string;
    if (existingRow?.id) {
      settlementId = String(existingRow.id);
      const { error: updateError } = await client
        .from("dropship_daily_settlements")
        .update(payload)
        .eq("id", settlementId);
      if (updateError) return { error: updateError.message };

      await client
        .from("dropship_daily_settlement_lines")
        .delete()
        .eq("settlement_id", settlementId);
    } else {
      const { data: created, error: createError } = await client
        .from("dropship_daily_settlements")
        .insert(payload)
        .select("id")
        .single();
      if (createError || !created?.id) {
        return {
          error: createError?.message ?? "No se pudo guardar el reporte diario.",
        };
      }
      settlementId = String(created.id);
    }

    const lineRows = built.lines.map((line) => ({
      settlement_id: settlementId,
      catalog_order_id: line.catalogOrderId,
      supplier_user_id: line.supplierUserId,
      supplier_product_id: line.supplierProductId,
      product_title: line.productTitle,
      quantity: line.quantity,
      unit_cost_usd: line.unitCostUsd,
      platform_markup_usd: line.platformMarkupUsd,
      line_due_usd: line.lineDueUsd,
      supplier_payout_usd: line.supplierPayoutUsd,
      ...shippingToLineInsert(line.shipping),
    }));

    let { error: linesError } = await client
      .from("dropship_daily_settlement_lines")
      .insert(lineRows);
    if (linesError && /customer_document_id/i.test(linesError.message)) {
      const { error: withoutDocumentError } = await client
        .from("dropship_daily_settlement_lines")
        .insert(
          lineRows.map((row) => {
            const { customer_document_id, ...rest } = row;
            void customer_document_id;
            return rest;
          }),
        );
      linesError = withoutDocumentError;
    }
    if (
      linesError &&
      /customer_name|shipping_method|column .* does not exist/i.test(
        linesError.message,
      )
    ) {
      const { error: legacyLinesError } = await client
        .from("dropship_daily_settlement_lines")
        .insert(
          built.lines.map((line) => ({
            settlement_id: settlementId,
            catalog_order_id: line.catalogOrderId,
            supplier_user_id: line.supplierUserId,
            supplier_product_id: line.supplierProductId,
            product_title: line.productTitle,
            quantity: line.quantity,
            unit_cost_usd: line.unitCostUsd,
            platform_markup_usd: line.platformMarkupUsd,
            line_due_usd: line.lineDueUsd,
            supplier_payout_usd: line.supplierPayoutUsd,
          })),
        );
      linesError = legacyLinesError;
    }
    if (linesError) return { error: linesError.message };

    const { data: fresh, error: freshError } = await client
      .from("dropship_daily_settlements")
      .select(
        "id, store_id, store_name, merchant_user_id, merchant_email, business_date, order_count, wholesale_cost_usd, platform_markup_usd, markup_percent, amount_due_usd, status, payment_method, payment_reference, payment_proof_url, payment_notes, reported_at, reviewed_at, reviewed_by, review_notes, created_at",
      )
      .eq("id", settlementId)
      .single();
    if (freshError || !fresh) {
      return { error: freshError?.message ?? "No se pudo leer el reporte." };
    }

    revalidatePath("/dashboard/pedidos");
    revalidatePath("/dashboard/liquidacion");
    revalidatePath("/admin/dashboard");

    return {
      settlement: mapSettlementRecord(
        fresh as Record<string, unknown>,
        [],
        [],
        groupSettlementShipments(built.lines),
        built.suppliers,
      ),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo reportar el pago diario.",
    };
  }
}
