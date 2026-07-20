"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import {
  buildPaidProfilePatch,
  normalizeDbPlan,
} from "@/lib/plans/plan-activation";
import { uploadSubscriptionPaymentProof } from "@/lib/plans/manual-payment-storage";
import {
  calculateUpgradeProration,
  isBillingPeriod,
  type BillingPeriod,
} from "@/lib/plans/proration";
import { resolveCurrentPeriodEndsAt } from "@/lib/plans/resolve-subscription-period";
import { getPendingBusinessUpgradePayment } from "@/lib/plans/get-business-upgrade-preview";

export type BusinessUpgradeActionResult = {
  error?: string;
  success?: boolean;
  creditUsd?: number;
  amountDueUsd?: number;
  daysRemaining?: number;
};

function normalizeReference(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

/**
 * Upgrade PRO → Business con prorrateo.
 * No crea un segundo comprobante si ya hay uno pending de Business.
 */
export async function submitBusinessUpgradePayment(
  formData: FormData,
): Promise<BusinessUpgradeActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const billingRaw = String(formData.get("billingPeriod") ?? "monthly").trim();
  const billingPeriod: BillingPeriod = isBillingPeriod(billingRaw)
    ? billingRaw
    : "monthly";
  const referenceNumber = normalizeReference(
    String(formData.get("referenceNumber") ?? ""),
  );
  const proofFile = formData.get("proofImage");

  if (referenceNumber.length < 4) {
    return { error: "Ingresa un número de referencia válido." };
  }

  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { error: "Sube la captura de tu pago." };
  }

  const existingPending = await getPendingBusinessUpgradePayment(
    auth.authUser.id,
  );
  if (existingPending) {
    return {
      error:
        "Ya tienes un comprobante de upgrade en revisión. Espera la confirmación antes de enviar otro.",
    };
  }

  const admin = createAdminClient();

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

  if (normalizeDbPlan(currentProfile?.plan) !== "PRO" && period.fromPlan !== "PRO") {
    return {
      error: "Solo los usuarios del plan Pro pueden hacer upgrade a Business.",
    };
  }

  const proration = calculateUpgradeProration({
    fromPlan: "PRO",
    toPlan: "BUSINESS",
    periodEndsAt: period.periodEndsAt,
    fromBillingPeriod: period.billingPeriod,
    toBillingPeriod: billingPeriod,
  });

  const upload = await uploadSubscriptionPaymentProof(
    auth.authUser.id,
    proofFile,
  );
  if (!upload.url) {
    return { error: upload.error ?? "No se pudo subir el comprobante." };
  }

  const { data: payment, error: insertError } = await admin
    .from("manual_payments")
    .insert({
      user_id: auth.authUser.id,
      plan_id: "premium",
      reference_number: referenceNumber,
      image_url: upload.url,
      status: "pending",
      billing_period: billingPeriod,
      from_plan: "PRO",
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

  // Cierra otros pendientes (p. ej. Pro) sin tocar el upgrade recién creado.
  await admin
    .from("manual_payments")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("user_id", auth.authUser.id)
    .eq("status", "pending")
    .neq("id", payment.id);

  const { error: profileError } = await admin
    .from("profiles")
    .update(
      buildPaidProfilePatch("BUSINESS", "provisional", {
        billingPeriod,
      }),
    )
    .eq("id", auth.authUser.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/dashboard/upgrade");
  revalidatePath("/dashboard/planes");
  revalidatePath("/activar");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin/dashboard");

  return {
    success: true,
    creditUsd: proration.creditUsd,
    amountDueUsd: proration.amountDueUsd,
    daysRemaining: proration.daysRemaining,
  };
}
