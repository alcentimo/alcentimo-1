import type { PlanId } from "@/src/config/plans";

export type BillingPeriod = "monthly" | "annual";

export const PAID_PLAN_CTA = "Empezar ahora";

export interface PlanPricingTier {
  planId: PlanId;
  displayName: string;
  tagline: string;
  /** Precio cobrado cada mes (facturación mensual). */
  monthlyUsd: number;
  /** Total cobrado al año; `null` si no aplica (plan gratis). */
  annualUsd: number | null;
  productLimitLabel: string;
  recommended?: boolean;
  features: string[];
  /** Nota visual de add-on (p. ej. sedes extras). */
  addonNote?: string | null;
  cta: string;
}

/** Planes mostrados en /dashboard/planes (mapean a IDs internos). */
export const PLAN_PRICING_TIERS: PlanPricingTier[] = [
  {
    planId: "free",
    displayName: "Gratis",
    tagline: "Ideal para empezar",
    monthlyUsd: 0,
    annualUsd: null,
    productLimitLabel: "Hasta 10 productos",
    features: [
      "Catálogo público con enlace único",
      "Precios USD y Bs automáticos",
      "Cupones, variantes y alertas de stock",
    ],
    cta: "Continuar gratis",
  },
  {
    planId: "starter",
    displayName: "Pro",
    tagline: "Para negocios en crecimiento",
    monthlyUsd: 8,
    annualUsd: 75,
    productLimitLabel: "Hasta 250 productos",
    recommended: true,
    features: [
      "Todo lo del plan Gratis",
      "Más capacidad de catálogo",
      "Soporte por email",
    ],
    cta: PAID_PLAN_CTA,
  },
  {
    planId: "premium",
    displayName: "Business",
    tagline: "Para marcas establecidas",
    monthlyUsd: 15,
    annualUsd: 144,
    productLimitLabel: "Productos ilimitados",
    features: [
      "Todo lo del plan Pro",
      "Dominio personalizado (tutienda.com)",
      "Usuarios y roles de equipo",
      "Soporte dedicado",
    ],
    cta: PAID_PLAN_CTA,
  },
  {
    planId: "enterprise",
    displayName: "Enterprise",
    tagline: "Multi-sucursal y operaciones avanzadas",
    monthlyUsd: 29,
    annualUsd: 278,
    productLimitLabel: "Productos ilimitados",
    features: [
      "Todo lo del plan Business",
      "Hasta 3 sucursales incluidas",
      "Selector de sede y retiro en tienda",
      "Stock independiente por sucursal",
    ],
    addonNote: "Sedes adicionales: +$6 USD/mes por cada sede extra",
    cta: PAID_PLAN_CTA,
  },
];

/** Precio mensual mostrado en la tarjeta (equivalente si es anual). */
export function getTierMonthlyDisplay(
  tier: PlanPricingTier,
  period: BillingPeriod,
): number {
  if (tier.monthlyUsd <= 0) return 0;
  if (period === "monthly") return tier.monthlyUsd;
  if (tier.annualUsd == null) return tier.monthlyUsd;
  return Math.round((tier.annualUsd / 12) * 100) / 100;
}

/** Monto real a cobrar (1 mes o total anual). */
export function getTierChargeUsd(
  tier: PlanPricingTier,
  period: BillingPeriod,
): number {
  if (tier.monthlyUsd <= 0) return 0;
  if (period === "monthly") return tier.monthlyUsd;
  return tier.annualUsd ?? tier.monthlyUsd * 12;
}

/** Ahorro en USD al elegir facturación anual vs 12 meses sueltos. */
export function getTierAnnualSavings(tier: PlanPricingTier): number | null {
  if (tier.monthlyUsd <= 0 || tier.annualUsd == null) return null;
  const savings = tier.monthlyUsd * 12 - tier.annualUsd;
  return savings > 0 ? savings : null;
}

export function formatPlanPriceForTier(
  tier: PlanPricingTier,
  period: BillingPeriod,
): string {
  const value = getTierMonthlyDisplay(tier, period);
  if (value === 0) return "Gratis";
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export function formatAnnualSavingsLabel(tier: PlanPricingTier): string | null {
  const savings = getTierAnnualSavings(tier);
  if (savings == null) return null;
  const formatted = Number.isInteger(savings) ? String(savings) : savings.toFixed(0);
  return `Ahorras $${formatted} al año`;
}

export function formatPlanCheckoutSummary(
  tier: PlanPricingTier,
  period: BillingPeriod,
): string {
  if (tier.monthlyUsd <= 0) return `Plan ${tier.displayName}`;

  if (period === "monthly") {
    return `Plan ${tier.displayName} — $${tier.monthlyUsd}/mes`;
  }

  const monthlyEquivalent = getTierMonthlyDisplay(tier, period);
  const annualTotal = tier.annualUsd ?? tier.monthlyUsd * 12;
  const equivLabel = Number.isInteger(monthlyEquivalent)
    ? monthlyEquivalent
    : monthlyEquivalent.toFixed(2);

  return `Plan ${tier.displayName} — $${equivLabel}/mes ($${annualTotal} al año)`;
}

/** Ahorro destacado del plan recomendado (Pro) para el toggle anual. */
export function getRecommendedAnnualSavingsLabel(): string | null {
  const recommended = PLAN_PRICING_TIERS.find((tier) => tier.recommended);
  return recommended ? formatAnnualSavingsLabel(recommended) : null;
}
