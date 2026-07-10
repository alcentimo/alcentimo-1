export type PlanId = "free" | "starter" | "growth" | "premium";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** `null` = productos ilimitados (Premium) */
  productLimit: number | null;
  priceUsdYearly: number;
}

export const DEFAULT_PLAN_ID: PlanId = "free";

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Plan Gratis",
    productLimit: 15,
    priceUsdYearly: 0,
  },
  starter: {
    id: "starter",
    name: "Plan Starter",
    productLimit: 250,
    priceUsdYearly: 39,
  },
  growth: {
    id: "growth",
    name: "Plan Growth",
    productLimit: 1000,
    priceUsdYearly: 99,
  },
  premium: {
    id: "premium",
    name: "Plan Premium",
    productLimit: null,
    priceUsdYearly: 199,
  },
};

export const PLAN_LIST: PlanDefinition[] = [
  PLANS.free,
  PLANS.starter,
  PLANS.growth,
  PLANS.premium,
];

export interface ProductLimitCheck {
  planId: PlanId;
  planName: string;
  currentCount: number;
  productLimit: number | null;
  canCreateMore: boolean;
  hasReachedLimit: boolean;
  remainingSlots: number | null;
}

/** Todos los planes incluyen las mismas funcionalidades; solo varía el tope de productos. */
export function canUseDashboardFeatures(_planId?: PlanId | null): boolean {
  return true;
}

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

const DB_PLAN_ALIASES: Record<string, PlanId> = {
  free: "free",
  FREE: "free",
  starter: "starter",
  STARTER: "starter",
  growth: "growth",
  GROWTH: "growth",
  premium: "premium",
  PREMIUM: "premium",
};

/** Normaliza el valor de `profiles.plan` (p. ej. `FREE`) al `PlanId` interno. */
export function resolvePlanId(planId?: string | null): PlanId {
  if (!planId) return DEFAULT_PLAN_ID;

  const trimmed = planId.trim();
  const fromDb = DB_PLAN_ALIASES[trimmed];
  if (fromDb) return fromDb;

  const lower = trimmed.toLowerCase();
  if (isPlanId(lower)) return lower;

  return DEFAULT_PLAN_ID;
}

export function getPlanById(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

export function isUnlimitedProductLimit(productLimit: number | null): boolean {
  return productLimit === null;
}

export function hasReachedProductLimit(
  currentCount: number,
  planId: PlanId,
): boolean {
  const plan = getPlanById(planId);
  if (isUnlimitedProductLimit(plan.productLimit)) return false;
  return currentCount >= (plan.productLimit as number);
}

export function canCreateProduct(currentCount: number, planId: PlanId): boolean {
  return !hasReachedProductLimit(currentCount, planId);
}

export function getRemainingProductSlots(
  currentCount: number,
  planId: PlanId,
): number | null {
  const plan = getPlanById(planId);
  if (isUnlimitedProductLimit(plan.productLimit)) return null;
  return Math.max(0, (plan.productLimit as number) - currentCount);
}

export function buildProductLimitCheck(
  currentCount: number,
  planId: PlanId,
): ProductLimitCheck {
  const plan = getPlanById(planId);
  const hasReachedLimit = hasReachedProductLimit(currentCount, planId);

  return {
    planId: plan.id,
    planName: plan.name,
    currentCount,
    productLimit: plan.productLimit,
    canCreateMore: !hasReachedLimit,
    hasReachedLimit,
    remainingSlots: getRemainingProductSlots(currentCount, planId),
  };
}

export function formatProductLimit(productLimit: number | null): string {
  return isUnlimitedProductLimit(productLimit) ? "Ilimitados" : String(productLimit);
}

export function getProductLimitErrorMessage(check: ProductLimitCheck): string {
  if (check.canCreateMore) return "";

  if (isUnlimitedProductLimit(check.productLimit)) {
    return "No puedes crear más productos en este momento.";
  }

  return `Has alcanzado el límite de ${check.productLimit} productos de tu ${check.planName}. Actualiza tu plan para publicar más.`;
}
