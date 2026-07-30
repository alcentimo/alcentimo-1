import type { ProfilePlanDb } from "@/lib/database.types";
import {
  getTierChargeUsd,
  PLAN_PRICING_TIERS,
  type BillingPeriod,
} from "@/src/config/plan-pricing-ui";
import type { PlanId } from "@/src/config/plans";
import {
  getChargeUsdFromTable,
  type PlanChargeTable,
} from "@/lib/plans/plan-settings";

export type { BillingPeriod };
export type { PlanChargeTable };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Días de referencia para prorrateo de crédito (no para fecha de corte). */
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
  if (normalized === "ENTERPRISE") {
    return "ENTERPRISE";
  }
  return "FREE";
}

function dbPlanToPricingPlanId(plan: ProfilePlanDb): PlanId | null {
  if (plan === "PRO") return "starter";
  if (plan === "BUSINESS") return "premium";
  if (plan === "ENTERPRISE") return "enterprise";
  return null;
}

export function getDbPlanChargeUsd(
  plan: ProfilePlanDb,
  billing: BillingPeriod,
  charges?: PlanChargeTable,
): number {
  if (charges) {
    return getChargeUsdFromTable(plan, billing, charges);
  }
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

/**
 * Suma un ciclo de facturación en calendario (mes o año exacto).
 * Ej.: 30 jul → 30 ago (no +30 días → 29 ago).
 * Si el día no existe en el mes destino (31 ene → feb), se ajusta al último día válido.
 */
export function addBillingPeriod(from: Date, billing: BillingPeriod): Date {
  const result = new Date(from.getTime());

  if (billing === "annual") {
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    return result;
  }

  const dayOfMonth = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(dayOfMonth, daysInTargetMonth));
  return result;
}

/** Fin de ciclo a partir del inicio (corrige cortes guardados con +30 días). */
export function resolvePeriodEndsAtFromStart(
  startedAt: string | Date | null | undefined,
  billing: BillingPeriod,
  fallbackEndsAt?: string | Date | null,
): string | null {
  if (startedAt) {
    const start = new Date(startedAt);
    if (!Number.isNaN(start.getTime())) {
      return addBillingPeriod(start, billing).toISOString();
    }
  }
  if (!fallbackEndsAt) return null;
  const ends = new Date(fallbackEndsAt);
  return Number.isNaN(ends.getTime()) ? null : ends.toISOString();
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
  /** Precios desde plan_settings; si falta, usa PLAN_PRICING_TIERS. */
  charges?: PlanChargeTable;
}): UpgradeProrationResult {
  const fromPlan = normalizePlan(input.fromPlan);
  const toPlan = normalizePlan(input.toPlan);
  const fromBilling = input.fromBillingPeriod ?? "monthly";
  const toBilling = input.toBillingPeriod;
  const now = input.now ?? new Date();

  const listPriceUsd = getDbPlanChargeUsd(toPlan, toBilling, input.charges);
  const periodDays = BILLING_PERIOD_DAYS[fromBilling];
  const fromPlanChargeUsd = getDbPlanChargeUsd(
    fromPlan,
    fromBilling,
    input.charges,
  );

  const planRank: Record<ProfilePlanDb, number> = {
    FREE: 0,
    PRO: 1,
    BUSINESS: 2,
    ENTERPRISE: 3,
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
