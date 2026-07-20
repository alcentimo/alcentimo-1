"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import type { ManualPaymentPlanId } from "@/lib/database.types";
import {
  buildPaidProfilePatch,
  isManualPaymentPlanId,
  manualPaymentPlanToDbPlan,
} from "@/lib/plans/plan-activation";
import { uploadSubscriptionPaymentProof } from "@/lib/plans/manual-payment-storage";
import {
  calculateUpgradeProration,
  isBillingPeriod,
  type BillingPeriod,
} from "@/lib/plans/proration";
import { resolveCurrentPeriodEndsAt } from "@/lib/plans/resolve-subscription-period";
import {
  getUserPaymentReview,
  isReferencePermanentlyRejected,
} from "@/lib/plans/get-user-payment-review";
import {
  buildChargeTableFromSettings,
} from "@/lib/plans/plan-settings";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import type { PlanId } from "@/src/config/plans";

export type ManualPaymentActionResult = {
  error?: string;
  success?: boolean;
  creditUsd?: number;
  amountDueUsd?: number;
  daysRemaining?: number;
};

const UPGRADE_PLAN_IDS = new Set<PlanId>(["starter", "premium"]);

function normalizeReference(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

async function rejectPendingPaymentsForUser(
  userId: string,
  excludeId?: string,
): Promise<void> {
  const admin = createAdminClient();

  let query = admin
    .from("manual_payments")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  await query;
}

/** Reporta pago manual y otorga acceso provisional de inmediato. */
export async function submitManualPayment(
  formData: FormData,
): Promise<ManualPaymentActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const planId = String(formData.get("planId") ?? "").trim() as PlanId;
  const billingRaw = String(formData.get("billingPeriod") ?? "monthly").trim();
  const billingPeriod: BillingPeriod = isBillingPeriod(billingRaw)
    ? billingRaw
    : "monthly";
  const referenceNumber = normalizeReference(
    String(formData.get("referenceNumber") ?? ""),
  );
  const proofFile = formData.get("proofImage");

  if (!UPGRADE_PLAN_IDS.has(planId) || !isManualPaymentPlanId(planId)) {
    return { error: "Plan no válido para suscripción." };
  }

  if (referenceNumber.length < 4) {
    return { error: "Ingresa un número de referencia válido." };
  }

  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { error: "Sube la captura de tu pago." };
  }

  if (await isReferencePermanentlyRejected(auth.authUser.id, referenceNumber)) {
    return {
      error:
        "Esta referencia fue rechazada permanentemente. Usa otra referencia o contacta soporte.",
    };
  }

  const existingReview = await getUserPaymentReview(auth.authUser.id);
  if (existingReview) {
    return {
      error: existingReview.needsCorrection
        ? "Ya tienes un comprobante pendiente de corrección. Ve a Estado de tu pago para reenviarlo."
        : "Ya tienes un pago en revisión. Espera la confirmación antes de enviar otro.",
    };
  }

  const upload = await uploadSubscriptionPaymentProof(auth.authUser.id, proofFile);
  if (!upload.url) {
    return { error: upload.error ?? "No se pudo subir el comprobante." };
  }

  const admin = createAdminClient();
  const planDb = manualPaymentPlanToDbPlan(planId as ManualPaymentPlanId);

  const { data: currentProfile } = await admin
    .from("profiles")
    .select(
      "plan, billing_period, subscription_period_started_at, subscription_period_ends_at",
    )
    .eq("id", auth.authUser.id)
    .maybeSingle();

  const period = await resolveCurrentPeriodEndsAt(
    auth.authUser.id,
    currentProfile,
  );

  const proration = calculateUpgradeProration({
    fromPlan: period.fromPlan,
    toPlan: planDb,
    periodEndsAt: period.periodEndsAt,
    fromBillingPeriod: period.billingPeriod,
    toBillingPeriod: billingPeriod,
    charges: buildChargeTableFromSettings(await fetchPlanSettings()),
  });

  const { data: payment, error: insertError } = await admin
    .from("manual_payments")
    .insert({
      user_id: auth.authUser.id,
      plan_id: planId,
      reference_number: referenceNumber,
      image_url: upload.url,
      status: "pending",
      billing_period: billingPeriod,
      from_plan: period.fromPlan,
      from_billing_period: period.billingPeriod,
      list_price_usd: proration.listPriceUsd,
      credit_usd: proration.creditUsd,
      amount_due_usd: proration.amountDueUsd,
      days_remaining: proration.daysRemaining,
      credited_period_ends_at: period.periodEndsAt,
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    return { error: insertError?.message ?? "No se pudo registrar el pago." };
  }

  await rejectPendingPaymentsForUser(auth.authUser.id, payment.id);

  const { error: profileError } = await admin
    .from("profiles")
    .update(
      buildPaidProfilePatch(planDb, "provisional", {
        billingPeriod,
      }),
    )
    .eq("id", auth.authUser.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/pago");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin/dashboard");

  return {
    success: true,
    creditUsd: proration.creditUsd,
    amountDueUsd: proration.amountDueUsd,
    daysRemaining: proration.daysRemaining,
  };
}
