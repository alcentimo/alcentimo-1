import type { Profile, ProfilePlanDb } from "@/lib/database.types";
import type { ManualPaymentPlanId } from "@/lib/database.types";
import { resolvePlanId, type PlanId } from "@/src/config/plans";
import {
  addBillingPeriod,
  type BillingPeriod,
} from "@/lib/plans/proration";

export type SubscriptionStatus = "none" | "provisional" | "active";

/** IDs internos del checkout → valores persistidos en profiles.plan */
const PLAN_ID_TO_DB: Record<ManualPaymentPlanId, ProfilePlanDb> = {
  starter: "PRO",
  premium: "BUSINESS",
};

export function normalizeDbPlan(value: string | null | undefined): ProfilePlanDb {
  const normalized = (value ?? "FREE").trim().toUpperCase();
  if (normalized === "FREE") return "FREE";
  if (
    normalized === "PRO" ||
    normalized === "STARTER" ||
    normalized === "GROWTH"
  ) {
    return "PRO";
  }
  if (normalized === "BUSINESS" || normalized === "PREMIUM") {
    return "BUSINESS";
  }
  return "FREE";
}

export function resolveSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  if (value === "provisional" || value === "active") return value;
  return "none";
}

/**
 * ¿Puede reclamar la prueba Pro gratis?
 * Solo plan FREE en BD y subscription_status = none. No valida conteo de productos.
 */
export function isEligiblePlanForProTrial(
  profile: Pick<
    Profile,
    "plan" | "subscription_status" | "pro_trial_started_at"
  > | null,
): boolean {
  if (!profile || profile.pro_trial_started_at != null) {
    return false;
  }

  return (
    normalizeDbPlan(profile.plan) === "FREE" &&
    resolveSubscriptionStatus(profile.subscription_status) === "none"
  );
}

export function manualPaymentPlanToDbPlan(
  planId: ManualPaymentPlanId,
): ProfilePlanDb {
  return PLAN_ID_TO_DB[planId];
}

export function dbPlanToPlanId(plan: string | null | undefined): PlanId {
  return resolvePlanId(plan);
}

export function isManualPaymentPlanId(value: string): value is ManualPaymentPlanId {
  return value === "starter" || value === "premium";
}

/** Limpia trial Pro al activar suscripción de pago y reinicia el ciclo. */
export function buildPaidProfilePatch(
  planDb: ProfilePlanDb,
  subscriptionStatus: SubscriptionStatus,
  options?: {
    billingPeriod?: BillingPeriod;
    periodStartedAt?: Date;
  },
) {
  if (planDb === "FREE") {
    return {
      plan: planDb,
      subscription_status: subscriptionStatus,
      pro_trial_started_at: null,
      pro_trial_ends_at: null,
      billing_period: null,
      subscription_period_started_at: null,
      subscription_period_ends_at: null,
    };
  }

  const billingPeriod = options?.billingPeriod ?? "monthly";
  const startedAt = options?.periodStartedAt ?? new Date();
  const endsAt = addBillingPeriod(startedAt, billingPeriod);

  return {
    plan: planDb,
    subscription_status: subscriptionStatus,
    pro_trial_started_at: null,
    pro_trial_ends_at: null,
    billing_period: billingPeriod,
    subscription_period_started_at: startedAt.toISOString(),
    subscription_period_ends_at: endsAt.toISOString(),
  };
}

export function buildRevokedProfilePatch() {
  return buildPaidProfilePatch("FREE", "none");
}
