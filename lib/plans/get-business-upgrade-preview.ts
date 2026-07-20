import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import {
  calculateUpgradeProration,
  type BillingPeriod,
  type UpgradeProrationResult,
} from "@/lib/plans/proration";
import { resolveCurrentPeriodEndsAt } from "@/lib/plans/resolve-subscription-period";
import {
  buildChargeTableFromSettings,
} from "@/lib/plans/plan-settings";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import type { ManualPayment } from "@/lib/database.types";

export interface PendingUpgradePayment {
  id: string;
  reference_number: string;
  created_at: string;
  amount_due_usd: number | null;
  credit_usd: number | null;
  days_remaining: number | null;
  list_price_usd: number | null;
  status: "pending" | "needs_correction";
}

export interface BusinessUpgradePreview {
  eligible: boolean;
  reason?: string;
  billingPeriod: BillingPeriod;
  proration: UpgradeProrationResult | null;
  pendingPayment: PendingUpgradePayment | null;
}

export async function getPendingBusinessUpgradePayment(
  userId: string,
): Promise<PendingUpgradePayment | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manual_payments")
    .select(
      "id, reference_number, created_at, amount_due_usd, credit_usd, days_remaining, list_price_usd, plan_id, status",
    )
    .eq("user_id", userId)
    .eq("plan_id", "premium")
    .in("status", ["pending", "needs_correction"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    reference_number: data.reference_number,
    created_at: data.created_at,
    amount_due_usd: data.amount_due_usd ?? null,
    credit_usd: data.credit_usd ?? null,
    days_remaining: data.days_remaining ?? null,
    list_price_usd: data.list_price_usd ?? null,
    status:
      data.status === "needs_correction" ? "needs_correction" : "pending",
  };
}

/** Vista previa del upgrade PRO → Business (saldo y monto a pagar). */
export async function getBusinessUpgradePreview(
  userId: string,
  billingPeriod: BillingPeriod = "monthly",
): Promise<BusinessUpgradePreview> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "plan, billing_period, subscription_period_started_at, subscription_period_ends_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const pendingPayment = await getPendingBusinessUpgradePayment(userId);
  const period = await resolveCurrentPeriodEndsAt(userId, profile);
  const fromPlan = period.fromPlan;
  const settings = await fetchPlanSettings();
  const proration = calculateUpgradeProration({
    fromPlan,
    toPlan: "BUSINESS",
    periodEndsAt: period.periodEndsAt,
    fromBillingPeriod: period.billingPeriod,
    toBillingPeriod: billingPeriod,
    charges: buildChargeTableFromSettings(settings),
  });

  if (normalizeDbPlan(profile?.plan) !== "PRO" && fromPlan !== "PRO") {
    return {
      eligible: false,
      reason: "El upgrade a Business solo está disponible para el plan Pro.",
      billingPeriod,
      proration,
      pendingPayment,
    };
  }

  return {
    eligible: true,
    billingPeriod,
    proration,
    pendingPayment,
  };
}

export type { ManualPayment };
