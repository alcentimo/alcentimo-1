import type { PlanId } from "@/src/config/plans";

export type BillingPeriod = "monthly" | "annual";

export const PAID_PLAN_CTA = "Empezar ahora";

/** Aclaratoria legal sobre dominios en la sección de precios. */
export const PRICING_DOMAIN_DISCLAIMER =
  "Nota: Todos los planes de pago permiten conectar tu propio dominio (.com). El dominio no viene incluido con la suscripción; debes adquirirlo y registrarlo por tu cuenta con tu proveedor preferido (GoDaddy, Namecheap, etc.) y nosotros te guiamos en la conexión.";

/** Beneficio de conexión DNS en planes de pago. */
export const CUSTOM_DOMAIN_FEATURE =
  "Conexión de dominio personalizado (.com) (DNS a tu cargo)";

/** Enlace en subdominio de plataforma (plan Gratis). */
export const FREE_SUBDOMAIN_FEATURE =
  "Catálogo en subdominio Alcentimo (tuempresa.alcentimo.com)";

export const AI_ASSISTANT_FEATURE =
  "Asistente de IA integrado (redacción, optimización y soporte)";

export const AI_ASSISTANT_ADVANCED_FEATURE =
  "Asistente de IA integrado avanzado";

export const AI_MULTISEDED_FEATURE =
  "Asistente IA Multisede de alta precisión (audita, centraliza y analiza inventarios y ventas de todas tus sucursales)";

export function isCustomDomainFeature(feature: string): boolean {
  return feature.startsWith("Conexión de dominio personalizado");
}

export function planIncludesCustomDomain(planId: PlanId): boolean {
  return (
    planId === "starter" ||
    planId === "growth" ||
    planId === "premium" ||
    planId === "enterprise"
  );
}

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
  /** Aclaratoria destacada bajo la lista de beneficios. */
  footnote?: string | null;
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
      FREE_SUBDOMAIN_FEATURE,
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
    productLimitLabel: "Hasta 150 productos",
    recommended: true,
    features: [
      CUSTOM_DOMAIN_FEATURE,
      AI_ASSISTANT_FEATURE,
      "Precios USD y Bs automáticos + cupones y variantes",
    ],
    cta: PAID_PLAN_CTA,
  },
  {
    planId: "premium",
    displayName: "Business",
    tagline: "Para marcas establecidas",
    monthlyUsd: 15,
    annualUsd: 144,
    productLimitLabel: "Hasta 2.000 productos",
    features: [
      "Todo lo del plan Pro",
      CUSTOM_DOMAIN_FEATURE,
      "Usuarios y roles de equipo + Soporte dedicado",
      AI_ASSISTANT_ADVANCED_FEATURE,
    ],
    footnote: "Importante: este plan no incluye multisede.",
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
      "Hasta 3 sucursales incluidas con stock independiente por sede y selector de sede",
      CUSTOM_DOMAIN_FEATURE,
      AI_MULTISEDED_FEATURE,
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
