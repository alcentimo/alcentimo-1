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
    productLimit: 10,
    priceUsdYearly: 0,
  },
  starter: {
    id: "starter",
    name: "Plan Pro",
    productLimit: 250,
    priceUsdYearly: 39,
  },
  growth: {
    id: "growth",
    name: "Plan Pro",
    productLimit: 1000,
    priceUsdYearly: 99,
  },
  premium: {
    id: "premium",
    name: "Plan Business",
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

/** Enlace a la sección de precios en la landing. */
export const PRICING_SECTION_HREF = "/#precios";

/** Página interna de planes en el dashboard. */
export const DASHBOARD_PLANS_HREF = "/dashboard/planes";

/** Avisar cuando quedan esta cantidad de slots o menos (p. ej. 7/10 en plan Free). */
export const PRODUCT_LIMIT_NEAR_REMAINING = 3;

const NEXT_PLAN_DISPLAY_NAME: Record<PlanId, string | null> = {
  free: "Pro",
  starter: "Business",
  growth: "Business",
  premium: null,
};

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
  pro: "starter",
  PRO: "starter",
  starter: "starter",
  STARTER: "starter",
  growth: "growth",
  GROWTH: "growth",
  business: "premium",
  BUSINESS: "premium",
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
  options?: { productLimit?: number | null },
): ProductLimitCheck {
  const plan = getPlanById(planId);
  const productLimit =
    options && "productLimit" in options
      ? (options.productLimit ?? null)
      : plan.productLimit;
  const hasReachedLimit = isUnlimitedProductLimit(productLimit)
    ? false
    : currentCount >= (productLimit as number);

  return {
    planId: plan.id,
    planName: plan.name,
    currentCount,
    productLimit,
    canCreateMore: !hasReachedLimit,
    hasReachedLimit,
    remainingSlots: isUnlimitedProductLimit(productLimit)
      ? null
      : Math.max(0, (productLimit as number) - currentCount),
  };
}

export function formatProductLimit(productLimit: number | null): string {
  return isUnlimitedProductLimit(productLimit) ? "Ilimitados" : String(productLimit);
}

export function getUpgradePlanName(planId: PlanId): string | null {
  return NEXT_PLAN_DISPLAY_NAME[planId];
}

export function isNearProductLimit(
  check: ProductLimitCheck,
  remainingThreshold = PRODUCT_LIMIT_NEAR_REMAINING,
): boolean {
  if (check.hasReachedLimit || check.productLimit == null) return false;
  if (check.remainingSlots == null) return false;
  return check.remainingSlots <= remainingThreshold;
}

export function shouldShowProductLimitBanner(check: ProductLimitCheck): boolean {
  return check.hasReachedLimit || isNearProductLimit(check);
}

export function getProductLimitErrorMessage(
  check: ProductLimitCheck,
  trial?: {
    eligible: boolean;
    active: boolean;
    consumed?: boolean;
    startedAt?: string | null;
    /** Límite del plan Pro (prueba); si falta, usa PLANS.starter. */
    productLimit?: number | null;
  },
): string {
  if (check.canCreateMore) return "";

  const canOfferProTrial =
    trial != null &&
    !trial.active &&
    !trial.consumed &&
    trial.startedAt == null &&
    trial.eligible;

  if (canOfferProTrial) {
    const trialLimit =
      trial.productLimit !== undefined
        ? trial.productLimit
        : getPlanById("starter").productLimit;
    const trialLabel =
      trialLimit == null ? "productos ilimitados" : `${trialLimit} productos`;
    return `¡Has alcanzado tu límite! Activa una prueba gratuita de un mes del plan Pro (${trialLabel})`;
  }

  if (isUnlimitedProductLimit(check.productLimit)) {
    return "No puedes crear más productos en este momento.";
  }

  const upgradePlan = getUpgradePlanName(check.planId);
  if (upgradePlan) {
    return `Has alcanzado el límite de ${check.productLimit} productos. Actualiza a ${upgradePlan} para continuar.`;
  }

  return `Has alcanzado el límite de ${check.productLimit} productos de tu ${check.planName}.`;
}
