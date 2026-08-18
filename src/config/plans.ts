export type PlanId = "free" | "starter" | "growth" | "premium" | "enterprise";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** `null` = productos ilimitados */
  productLimit: number | null;
  priceUsdYearly: number;
}

export const DEFAULT_PLAN_ID: PlanId = "free";

/** Nombre comercial corto (solo UI; no altera ids de BD ni PlanId). */
export const PLAN_SHORT_DISPLAY_NAMES: Record<PlanId, string> = {
  free: "Principiante",
  starter: "Emprendedor",
  growth: "Emprendedor",
  premium: "Pro",
  enterprise: "Corporativo",
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Plan Principiante",
    productLimit: 10,
    priceUsdYearly: 0,
  },
  starter: {
    id: "starter",
    name: "Plan Emprendedor",
    productLimit: 150,
    priceUsdYearly: 39,
  },
  growth: {
    id: "growth",
    name: "Plan Emprendedor",
    productLimit: 1000,
    priceUsdYearly: 99,
  },
  premium: {
    id: "premium",
    name: "Plan Pro",
    productLimit: 2000,
    priceUsdYearly: 199,
  },
  enterprise: {
    id: "enterprise",
    name: "Plan Corporativo",
    productLimit: null,
    priceUsdYearly: 278,
  },
};

export const PLAN_LIST: PlanDefinition[] = [
  PLANS.free,
  PLANS.starter,
  PLANS.growth,
  PLANS.premium,
  PLANS.enterprise,
];

/** Enlace a la sección de precios en la landing. */
export const PRICING_SECTION_HREF = "/#precios";

/** Página interna de planes en el dashboard. */
export const DASHBOARD_PLANS_HREF = "/dashboard/planes";

/** Avisar cuando quedan esta cantidad de slots o menos (p. ej. 7/10 en plan Free). */
export const PRODUCT_LIMIT_NEAR_REMAINING = 3;

const NEXT_PLAN_DISPLAY_NAME: Record<PlanId, string | null> = {
  free: "Emprendedor",
  starter: "Pro",
  growth: "Pro",
  premium: "Corporativo",
  enterprise: null,
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
  enterprise: "enterprise",
  ENTERPRISE: "enterprise",
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

/**
 * Resuelve un PlanId a partir de códigos de BD, ids internos o nombres comerciales
 * (incluidos alias legacy: Pro, Business, Enterprise).
 */
export function resolvePlanIdFromLabel(
  value: string | PlanId | null | undefined,
): PlanId | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const fromDb =
    DB_PLAN_ALIASES[trimmed] ?? DB_PLAN_ALIASES[trimmed.toUpperCase()];
  if (fromDb) return fromDb;

  const lower = trimmed.toLowerCase();
  if (isPlanId(lower)) return lower;

  const normalized = lower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^plan\s+/, "")
    .trim();

  const labelAliases: Record<string, PlanId> = {
    free: "free",
    gratis: "free",
    principiante: "free",
    emprendedor: "starter",
    profesional: "starter",
    starter: "starter",
    growth: "growth",
    business: "premium",
    comercial: "premium",
    premium: "premium",
    pro: "premium",
    enterprise: "enterprise",
    corporativo: "enterprise",
  };

  return labelAliases[normalized] ?? null;
}

/**
 * Traductor visual de planes (solo UI).
 * NO cambia ids internos (`free`/`starter`/`premium`/`enterprise`),
 * ni códigos de BD (`FREE`/`PRO`/`BUSINESS`/`ENTERPRISE`), ni validaciones.
 *
 * Ej.: `starter` | `emprendedor` | `PRO` → `Emprendedor`
 */
export function formatPlanDisplayName(
  value: string | PlanId | null | undefined,
): string {
  const planId = resolvePlanIdFromLabel(value);
  if (planId) return PLAN_SHORT_DISPLAY_NAMES[planId];

  const raw = String(value ?? "").trim();
  if (!raw) return PLAN_SHORT_DISPLAY_NAMES.free;
  const withoutPlan = raw.replace(/^plan\s+/i, "").trim();
  const known = Object.values(PLAN_SHORT_DISPLAY_NAMES).find(
    (name) => name.toLowerCase() === withoutPlan.toLowerCase(),
  );
  return known ?? withoutPlan;
}

/** Alias preferido para UI: formatPlanName(plan) → Principiante | Emprendedor | Pro | Corporativo. */
export const formatPlanName = formatPlanDisplayName;

/** Etiqueta con prefijo Plan: «Plan Emprendedor», «Plan Principiante», etc. (solo UI). */
export function formatPlanLabel(
  value: string | PlanId | null | undefined,
): string {
  const short = formatPlanDisplayName(value);
  return `Plan ${short}`;
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

/**
 * `currentCount` debe ser el número de filas en `products` (activas / no borradas).
 * No usar conteos de `product_images`: la galería no consume cupos del plan.
 */
export function buildProductLimitCheck(
  currentCount: number,
  planId: PlanId,
  options?: { productLimit?: number | null },
): ProductLimitCheck {
  const plan = getPlanById(planId);
  const safeCount = Math.max(0, Math.floor(Number(currentCount) || 0));
  const productLimit =
    options && "productLimit" in options
      ? (options.productLimit ?? null)
      : plan.productLimit;
  const hasReachedLimit = isUnlimitedProductLimit(productLimit)
    ? false
    : safeCount >= (productLimit as number);

  return {
    planId: plan.id,
    planName: plan.name,
    currentCount: safeCount,
    productLimit,
    canCreateMore: !hasReachedLimit,
    hasReachedLimit,
    remainingSlots: isUnlimitedProductLimit(productLimit)
      ? null
      : Math.max(0, (productLimit as number) - safeCount),
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
    benefitsActive?: boolean;
    consumed?: boolean;
    startedAt?: string | null;
    /** Límite del plan Pro (prueba); si falta, usa PLANS.starter. */
    productLimit?: number | null;
  },
): string {
  if (check.canCreateMore) return "";

  const trialBenefits = trial?.benefitsActive ?? trial?.active;
  const canOfferProTrial =
    trial != null &&
    !trialBenefits &&
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
    return `Has alcanzado el límite de productos del plan Gratis. Reclama 30 días gratis del Plan Profesional (${trialLabel}) o elige un plan de pago.`;
  }

  if (isUnlimitedProductLimit(check.productLimit)) {
    return "No puedes crear más productos en este momento.";
  }

  const upgradePlan = getUpgradePlanName(check.planId);
  if (upgradePlan) {
    return `Has alcanzado el límite de ${check.productLimit} productos. Actualiza a ${upgradePlan} para continuar.`;
  }

  return `Has alcanzado el límite de ${check.productLimit} productos de tu ${formatPlanLabel(check.planId)}.`;
}
