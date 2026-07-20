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

async function getPendingPayment(
  paymentId: string,
): Promise<{ payment?: ManualPayment; error?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manual_payments")
    .select(
      "id, user_id, plan_id, reference_number, image_url, status, created_at, verified_at, rejected_at, billing_period, from_plan, from_billing_period, list_price_usd, credit_usd, amount_due_usd, days_remaining, credited_period_ends_at",
    )
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
}

/**
 * Confirma un pago pendiente: recalcula saldo a favor (PRO → Business),
 * marca verified y activa el plan en profiles del dueño.
 */
export async function verifyManualPayment(
  paymentId: string,
): Promise<ManualPaymentAdminActionResult> {
  const gate = await requireSupportAdmin();
  if (!gate.ok) return { error: gate.error };

  const { payment, error: loadError } = await getPendingPayment(paymentId);
  if (loadError || !payment) return { error: loadError ?? "Pago no encontrado." };

  if (payment.status !== "pending") {
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
      list_price_usd: proration.listPriceUsd,
      credit_usd: proration.creditUsd,
      amount_due_usd: proration.amountDueUsd,
      days_remaining: proration.daysRemaining,
    })
    .eq("id", paymentId)
    .eq("status", "pending");

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

/** Rechaza un pago y revoca el acceso provisional si aplica. */
export async function rejectManualPayment(
  paymentId: string,
): Promise<ManualPaymentAdminActionResult> {
  const gate = await requireSupportAdmin();
  if (!gate.ok) return { error: gate.error };

  const { payment, error: loadError } = await getPendingPayment(paymentId);
  if (loadError || !payment) return { error: loadError ?? "Pago no encontrado." };

  if (payment.status !== "pending") {
    return { error: "Este pago ya fue procesado." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: paymentError } = await admin
    .from("manual_payments")
    .update({ status: "rejected", rejected_at: now })
    .eq("id", paymentId)
    .eq("status", "pending");

  if (paymentError) return { error: paymentError.message };

  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", payment.user_id)
    .maybeSingle();

  if (profile?.subscription_status === "provisional") {
    const previousPlan = normalizeDbPlan(payment.from_plan ?? "FREE");

    if (previousPlan === "FREE") {
      const { error: profileError } = await admin
        .from("profiles")
        .update(buildRevokedProfilePatch())
        .eq("id", payment.user_id);
      if (profileError) return { error: profileError.message };
    } else {
      const previousBilling: BillingPeriod =
        payment.from_billing_period && isBillingPeriod(payment.from_billing_period)
          ? payment.from_billing_period
          : "monthly";
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          plan: previousPlan,
          subscription_status: "active",
          billing_period: previousBilling,
          subscription_period_ends_at:
            payment.credited_period_ends_at ?? null,
          pro_trial_started_at: null,
          pro_trial_ends_at: null,
        })
        .eq("id", payment.user_id);
      if (profileError) return { error: profileError.message };
    }
  }

  revalidatePlanPaths();
  return { success: true };
}
