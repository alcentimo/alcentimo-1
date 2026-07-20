import type { ProfilePlanDb } from "@/lib/database.types";
import {
  getTierChargeUsd,
  PLAN_PRICING_TIERS,
  type BillingPeriod,
} from "@/src/config/plan-pricing-ui";
import type { PlanId } from "@/src/config/plans";

export type { BillingPeriod };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const BILLING_PERIOD_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  annual: 365,
};

export interface UpgradeProrationResult {
  fromPlan: ProfilePlanDb;
  toPlan: ProfilePlanDb;
  billingPeriod: BillingPeriod;
  daysRemaining: number;
  periodDays: number;
  fromPlanChargeUsd: number;
  listPriceUsd: number;
  creditUsd: number;
  amountDueUsd: number;
  isUpgradeWithCredit: boolean;
}

function normalizePlan(value: string | null | undefined): ProfilePlanDb {
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

function dbPlanToPricingPlanId(plan: ProfilePlanDb): PlanId | null {
  if (plan === "PRO") return "starter";
  if (plan === "BUSINESS") return "premium";
  return null;
}

export function getDbPlanChargeUsd(
  plan: ProfilePlanDb,
  billing: BillingPeriod,
): number {
  const planId = dbPlanToPricingPlanId(plan);
  if (!planId) return 0;
  const tier = PLAN_PRICING_TIERS.find((entry) => entry.planId === planId);
  if (!tier) return 0;
  return getTierChargeUsd(tier, billing);
}

export function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Días restantes del ciclo actual (ceil; 0 si ya venció). */
export function calculateRemainingDays(
  periodEndsAt: string | Date | null | undefined,
  now: Date = new Date(),
): number {
  if (!periodEndsAt) return 0;
  const endsMs = new Date(periodEndsAt).getTime();
  if (Number.isNaN(endsMs)) return 0;
  const diff = endsMs - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

export function addBillingPeriod(from: Date, billing: BillingPeriod): Date {
  const result = new Date(from.getTime());
  result.setUTCDate(result.getUTCDate() + BILLING_PERIOD_DAYS[billing]);
  return result;
}

/**
 * Saldo a favor = (precio del plan actual / días del ciclo) * días restantes.
 * Monto a pagar = max(0, precio nuevo − saldo).
 * Solo aplica en upgrades de plan de pago inferior → superior (p. ej. PRO → Business).
 */
export function calculateUpgradeProration(input: {
  fromPlan: string | null | undefined;
  toPlan: string | null | undefined;
  periodEndsAt: string | Date | null | undefined;
  /** Ciclo del plan que genera el crédito (el actual). */
  fromBillingPeriod?: BillingPeriod | null;
  /** Ciclo que se está comprando. */
  toBillingPeriod: BillingPeriod;
  now?: Date;
}): UpgradeProrationResult {
  const fromPlan = normalizePlan(input.fromPlan);
  const toPlan = normalizePlan(input.toPlan);
  const fromBilling = input.fromBillingPeriod ?? "monthly";
  const toBilling = input.toBillingPeriod;
  const now = input.now ?? new Date();

  const listPriceUsd = getDbPlanChargeUsd(toPlan, toBilling);
  const periodDays = BILLING_PERIOD_DAYS[fromBilling];
  const fromPlanChargeUsd = getDbPlanChargeUsd(fromPlan, fromBilling);

  const planRank: Record<ProfilePlanDb, number> = {
    FREE: 0,
    PRO: 1,
    BUSINESS: 2,
  };

  const isUpgradeWithCredit =
    planRank[toPlan] > planRank[fromPlan] &&
    fromPlan !== "FREE" &&
    fromPlanChargeUsd > 0;

  const daysRemaining = isUpgradeWithCredit
    ? calculateRemainingDays(input.periodEndsAt, now)
    : 0;

  const rawCredit =
    isUpgradeWithCredit && daysRemaining > 0 && periodDays > 0
      ? (fromPlanChargeUsd / periodDays) * daysRemaining
      : 0;

  const creditUsd = roundUsd(Math.min(rawCredit, listPriceUsd));
  const amountDueUsd = roundUsd(Math.max(0, listPriceUsd - creditUsd));

  return {
    fromPlan,
    toPlan,
    billingPeriod: toBilling,
    daysRemaining,
    periodDays,
    fromPlanChargeUsd,
    listPriceUsd,
    creditUsd,
    amountDueUsd,
    isUpgradeWithCredit: isUpgradeWithCredit && creditUsd > 0,
  };
}

export function isBillingPeriod(value: string): value is BillingPeriod {
  return value === "monthly" || value === "annual";
}
