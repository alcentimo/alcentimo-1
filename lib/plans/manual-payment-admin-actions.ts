"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import type { ManualPayment } from "@/lib/database.types";
import {
  buildPaidProfilePatch,
  buildRevokedProfilePatch,
  manualPaymentPlanToDbPlan,
  normalizeDbPlan,
} from "@/lib/plans/plan-activation";
import {
  calculateUpgradeProration,
  isBillingPeriod,
  type BillingPeriod,
} from "@/lib/plans/proration";

export type ManualPaymentAdminActionResult = {
  error?: string;
  success?: boolean;
  creditUsd?: number;
  amountDueUsd?: number;
  daysRemaining?: number;
};

const PAYMENT_SELECT =
  "id, user_id, plan_id, reference_number, image_url, status, created_at, verified_at, rejected_at, billing_period, from_plan, from_billing_period, list_price_usd, credit_usd, amount_due_usd, days_remaining, credited_period_ends_at, admin_note, permanently_rejected, correction_requested_at";

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso para gestionar pagos." };
  }

  return { ok: true as const };
}

async function getPaymentById(
  paymentId: string,
): Promise<{ payment?: ManualPayment; error?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manual_payments")
    .select(PAYMENT_SELECT)
    .eq("id", paymentId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Pago no encontrado." };

  return { payment: data as ManualPayment };
}

function revalidatePlanPaths() {
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/dashboard");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/upgrade");
  revalidatePath("/dashboard/pago");
}

async function restorePreviousPlanAfterReject(payment: ManualPayment) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", payment.user_id)
    .maybeSingle();

  if (profile?.subscription_status !== "provisional") {
    return;
  }

  const previousPlan = normalizeDbPlan(payment.from_plan ?? "FREE");

  if (previousPlan === "FREE") {
    const { error } = await admin
      .from("profiles")
      .update(buildRevokedProfilePatch())
      .eq("id", payment.user_id);
    if (error) throw new Error(error.message);
    return;
  }

  const previousBilling: BillingPeriod =
    payment.from_billing_period && isBillingPeriod(payment.from_billing_period)
      ? payment.from_billing_period
      : "monthly";

  const { error } = await admin
    .from("profiles")
    .update({
      plan: previousPlan,
      subscription_status: "active",
      billing_period: previousBilling,
      subscription_period_ends_at: payment.credited_period_ends_at ?? null,
      pro_trial_started_at: null,
      pro_trial_ends_at: null,
    })
    .eq("id", payment.user_id);

  if (error) throw new Error(error.message);
}

/**
 * Confirma un pago pendiente o corregido: activa el plan en profiles.
 */
export async function verifyManualPayment(
  paymentId: string,
): Promise<ManualPaymentAdminActionResult> {
  const gate = await requireSupportAdmin();
  if (!gate.ok) return { error: gate.error };

  const { payment, error: loadError } = await getPaymentById(paymentId);
  if (loadError || !payment) return { error: loadError ?? "Pago no encontrado." };

  if (payment.status !== "pending" && payment.status !== "needs_correction") {
    return { error: "Este pago ya fue procesado." };
  }

  const admin = createAdminClient();
  const planDb = manualPaymentPlanToDbPlan(payment.plan_id);
  const billingPeriod: BillingPeriod =
    payment.billing_period && isBillingPeriod(payment.billing_period)
      ? payment.billing_period
      : "monthly";
  const now = new Date();
  const nowIso = now.toISOString();
  const ownerId = payment.user_id;

  const { data: ownedStores, error: storesError } = await admin
    .from("stores")
    .select("id")
    .eq("owner_id", ownerId)
    .limit(1);

  if (storesError) return { error: storesError.message };
  if (!ownedStores?.length) {
    return {
      error:
        "No se encontró una tienda con este owner_id. No se puede activar el plan.",
    };
  }

  const fromPlan = normalizeDbPlan(payment.from_plan ?? "FREE");
  const fromBilling: BillingPeriod =
    payment.from_billing_period && isBillingPeriod(payment.from_billing_period)
      ? payment.from_billing_period
      : "monthly";
  const proration = calculateUpgradeProration({
    fromPlan,
    toPlan: planDb,
    periodEndsAt: payment.credited_period_ends_at,
    fromBillingPeriod: fromBilling,
    toBillingPeriod: billingPeriod,
    now,
  });

  const { error: paymentError } = await admin
    .from("manual_payments")
    .update({
      status: "verified",
      verified_at: nowIso,
      permanently_rejected: false,
      admin_note: null,
      correction_requested_at: null,
      list_price_usd: proration.listPriceUsd,
      credit_usd: proration.creditUsd,
      amount_due_usd: proration.amountDueUsd,
      days_remaining: proration.daysRemaining,
    })
    .eq("id", paymentId)
    .in("status", ["pending", "needs_correction"]);

  if (paymentError) return { error: paymentError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update(
      buildPaidProfilePatch(planDb, "active", {
        billingPeriod,
        periodStartedAt: now,
      }),
    )
    .eq("id", ownerId);

  if (profileError) return { error: profileError.message };

  revalidatePlanPaths();
  revalidatePath("/dashboard", "layout");
  return {
    success: true,
    creditUsd: proration.creditUsd,
    amountDueUsd: proration.amountDueUsd,
    daysRemaining: proration.daysRemaining,
  };
}

/** Solicita corrección: el usuario ve el motivo y puede volver a subir el comprobante. */
export async function requestPaymentCorrection(
  paymentId: string,
  reason: string,
): Promise<ManualPaymentAdminActionResult> {
  const gate = await requireSupportAdmin();
  if (!gate.ok) return { error: gate.error };

  const note = reason.trim();
  if (note.length < 8) {
    return { error: "Escribe un motivo claro (mínimo 8 caracteres)." };
  }
  if (note.length > 500) {
    return { error: "El motivo no puede superar 500 caracteres." };
  }

  const { payment, error: loadError } = await getPaymentById(paymentId);
  if (loadError || !payment) return { error: loadError ?? "Pago no encontrado." };

  if (payment.status !== "pending" && payment.status !== "needs_correction") {
    return { error: "Solo puedes solicitar corrección en pagos pendientes." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: paymentError } = await admin
    .from("manual_payments")
    .update({
      status: "needs_correction",
      admin_note: note,
      correction_requested_at: now,
      permanently_rejected: false,
      rejected_at: null,
    })
    .eq("id", paymentId)
    .in("status", ["pending", "needs_correction"]);

  if (paymentError) return { error: paymentError.message };

  // Mantiene el acceso provisional; no revoca el plan.
  revalidatePlanPaths();
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Rechazo permanente: anula la solicitud y bloquea reenviar la misma referencia.
 */
export async function permanentlyRejectManualPayment(
  paymentId: string,
  reason?: string,
): Promise<ManualPaymentAdminActionResult> {
  const gate = await requireSupportAdmin();
  if (!gate.ok) return { error: gate.error };

  const note = (reason ?? "").trim();
  if (note.length > 0 && note.length < 8) {
    return { error: "Si indicas motivo, usa al menos 8 caracteres." };
  }
  if (note.length > 500) {
    return { error: "El motivo no puede superar 500 caracteres." };
  }

  const { payment, error: loadError } = await getPaymentById(paymentId);
  if (loadError || !payment) return { error: loadError ?? "Pago no encontrado." };

  if (
    payment.status !== "pending" &&
    payment.status !== "needs_correction"
  ) {
    return { error: "Este pago ya fue procesado." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: paymentError } = await admin
    .from("manual_payments")
    .update({
      status: "rejected",
      rejected_at: now,
      permanently_rejected: true,
      admin_note: note.length > 0 ? note : "Rechazado permanentemente por el administrador.",
      correction_requested_at: null,
    })
    .eq("id", paymentId)
    .in("status", ["pending", "needs_correction"]);

  if (paymentError) return { error: paymentError.message };

  try {
    await restorePreviousPlanAfterReject(payment);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo revertir el plan.",
    };
  }

  revalidatePlanPaths();
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/** @deprecated Usar permanentlyRejectManualPayment */
export async function rejectManualPayment(
  paymentId: string,
): Promise<ManualPaymentAdminActionResult> {
  return permanentlyRejectManualPayment(paymentId);
}
