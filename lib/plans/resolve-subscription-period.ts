import { createAdminClient } from "@/lib/supabase/admin";
import {
  addBillingPeriod,
  isBillingPeriod,
  type BillingPeriod,
} from "@/lib/plans/proration";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import type { Profile } from "@/lib/database.types";

type PeriodProfile = Pick<
  Profile,
  | "plan"
  | "billing_period"
  | "subscription_period_started_at"
  | "subscription_period_ends_at"
>;

/**
 * Resuelve el fin de ciclo del plan actual.
 * Si no hay fechas en profiles (usuarios legacy), infiere desde el último
 * pago verificado del plan PRO (starter).
 */
export async function resolveCurrentPeriodEndsAt(
  userId: string,
  profile: PeriodProfile | null,
): Promise<{
  periodEndsAt: string | null;
  billingPeriod: BillingPeriod;
  fromPlan: ReturnType<typeof normalizeDbPlan>;
}> {
  const fromPlan = normalizeDbPlan(profile?.plan);
  const billingPeriod: BillingPeriod =
    profile?.billing_period && isBillingPeriod(profile.billing_period)
      ? profile.billing_period
      : "monthly";

  if (profile?.subscription_period_ends_at) {
    return {
      periodEndsAt: profile.subscription_period_ends_at,
      billingPeriod,
      fromPlan,
    };
  }

  if (fromPlan !== "PRO" && fromPlan !== "BUSINESS") {
    return { periodEndsAt: null, billingPeriod, fromPlan };
  }

  const admin = createAdminClient();
  const planId = fromPlan === "PRO" ? "starter" : "premium";

  const { data: lastPayment } = await admin
    .from("manual_payments")
    .select("verified_at, created_at, billing_period")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .in("status", ["verified", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastPayment) {
    return { periodEndsAt: null, billingPeriod, fromPlan };
  }

  const inferredBilling: BillingPeriod =
    lastPayment.billing_period && isBillingPeriod(lastPayment.billing_period)
      ? lastPayment.billing_period
      : billingPeriod;

  const startIso = lastPayment.verified_at ?? lastPayment.created_at;
  const endsAt = addBillingPeriod(new Date(startIso), inferredBilling);

  return {
    periodEndsAt: endsAt.toISOString(),
    billingPeriod: inferredBilling,
    fromPlan,
  };
}
