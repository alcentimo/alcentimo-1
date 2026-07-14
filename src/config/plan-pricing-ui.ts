import type { PlanId } from "@/src/config/plans";

export type BillingPeriod = "monthly" | "annual";

/** Descuento al pagar anual (20 % → precio mensual equivalente). */
export const ANNUAL_BILLING_DISCOUNT = 0.2;

export interface PlanPricingTier {
  planId: PlanId;
  displayName: string;
  tagline: string;
  /** Precio de referencia en USD / mes (facturación mensual). */
  monthlyUsd: number;
  productLimitLabel: string;
  recommended?: boolean;
  features: string[];
  cta: string;
  /** Si true, el CTA abre correo de ventas en lugar de checkout. */
  contactSales?: boolean;
}

/** Tres planes mostrados en /dashboard/planes (mapean a IDs internos). */
export const PLAN_PRICING_TIERS: PlanPricingTier[] = [
  {
    planId: "free",
    displayName: "Gratis",
    tagline: "Ideal para empezar",
    monthlyUsd: 0,
    productLimitLabel: "Hasta 15 productos",
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
    monthlyUsd: 5,
    productLimitLabel: "Hasta 250 productos",
    recommended: true,
    features: [
      "Todo lo del plan Gratis",
      "Más capacidad de catálogo",
      "Soporte por email",
    ],
    cta: "Empezar ahora",
    contactSales: true,
  },
  {
    planId: "premium",
    displayName: "Business",
    tagline: "Para marcas establecidas",
    monthlyUsd: 15,
    productLimitLabel: "Productos ilimitados",
    features: [
      "Todo lo del plan Pro",
      "Usuarios y roles de equipo",
      "Soporte dedicado",
    ],
    cta: "Elegir plan",
    contactSales: true,
  },
];

export function getDisplayedMonthlyPrice(
  monthlyUsd: number,
  period: BillingPeriod,
): number {
  if (monthlyUsd <= 0) return 0;
  if (period === "monthly") return monthlyUsd;
  return Math.round(monthlyUsd * (1 - ANNUAL_BILLING_DISCOUNT) * 100) / 100;
}

export function formatPlanPrice(monthlyUsd: number, period: BillingPeriod): string {
  const value = getDisplayedMonthlyPrice(monthlyUsd, period);
  if (value === 0) return "Gratis";
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export function formatPlanCheckoutSummary(
  displayName: string,
  monthlyUsd: number,
  period: BillingPeriod,
): string {
  const price = formatPlanPrice(monthlyUsd, period);
  if (monthlyUsd <= 0) return `Plan ${displayName}`;
  const suffix = period === "annual" ? " (facturado anualmente)" : "";
  return `Plan ${displayName} — ${price}/mes${suffix}`;
}
