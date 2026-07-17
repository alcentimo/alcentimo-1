import Link from "next/link";
import {
  Check,
  Crown,
  Headphones,
  Package,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatExchangeRate, formatUsd, formatVes } from "@/lib/format";
import {
  PLANS,
  type PlanId,
} from "@/src/config/plans";

interface PricingGridProps {
  exchangeRate: number | null;
}

interface PlanFeature {
  text: string;
  icon: LucideIcon;
}

interface PlanMarketing {
  planId: PlanId;
  displayName: string;
  description: string;
  icon: LucideIcon;
  popular?: boolean;
  cta: string;
  ctaHref: string;
  features: PlanFeature[];
}

const LANDING_PLANS: PlanMarketing[] = [
  {
    planId: "free",
    displayName: "Starter",
    description:
      "Ideal para emprendedores que inician su digitalización. Catálogo base con gestión esencial.",
    icon: Sparkles,
    cta: "Comenzar gratis",
    ctaHref: "/dashboard/productos/nuevo",
    features: [
      { text: "Hasta 15 productos activos", icon: Package },
      { text: "Catálogo público con enlace dedicado", icon: Check },
      { text: "Conversión USD + Bs. en tiempo real", icon: Check },
      { text: "Gestión esencial de inventario", icon: Check },
    ],
  },
  {
    planId: "growth",
    displayName: "Growth",
    description:
      "Para operaciones en expansión. Inventario avanzado, multi-usuario y soporte prioritario.",
    icon: Rocket,
    popular: true,
    cta: "Elegir Growth",
    ctaHref: "/dashboard/planes",
    features: [
      { text: "Hasta 1.000 productos activos", icon: Package },
      { text: "Inventario avanzado y alertas operativas", icon: Check },
      { text: "Hasta 3 usuarios por organización", icon: Users },
      { text: "Soporte prioritario", icon: Headphones },
    ],
  },
  {
    planId: "premium",
    displayName: "Premium",
    description:
      "Escalabilidad total. Sin límites de productos, usuarios ilimitados y roles personalizados.",
    icon: Crown,
    cta: "Elegir Premium",
    ctaHref: "/dashboard/planes",
    features: [
      { text: "Productos ilimitados", icon: Package },
      { text: "Usuarios ilimitados", icon: Users },
      { text: "Roles personalizados para equipos", icon: Users },
      { text: "Onboarding directo y soporte dedicado", icon: Headphones },
    ],
  },
];

function toVes(usd: number, rate: number | null): string {
  if (rate == null) return "—";
  return formatVes(usd * rate);
}

export function PricingGrid({ exchangeRate }: PricingGridProps) {
  const plans = LANDING_PLANS.map((marketing) => {
    const plan = PLANS[marketing.planId];

    return {
      id: marketing.planId,
      name: marketing.displayName,
      description: marketing.description,
      priceUsd: plan.priceUsdYearly,
      icon: marketing.icon,
      popular: marketing.popular,
      cta: marketing.cta,
      ctaHref: marketing.ctaHref,
      features: marketing.features,
    };
  });

  return (
    <section
      id="precios"
      className="section-padding border-b border-zinc-200/60 bg-[#FAFAF9] dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-5">
            <p className="section-label">Planes y precios</p>
            <h2 className="section-title mt-3 max-w-md">
              Inversión escalable para cada etapa
            </h2>
            <p className="section-subtitle mt-4 max-w-md">
              Suscripción anual en USD con equivalente en bolívares según tasa de
              mercado. Estructura transparente, sin costos ocultos.
            </p>
            {exchangeRate != null && (
              <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
                Tasa referencial:{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Bs. {formatExchangeRate(exchangeRate)} / USD
                </span>
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-zinc-500 lg:col-span-7 lg:text-right dark:text-zinc-400">
            El equivalente en bolívares es referencial. Los precios de tu catálogo
            se recalculan automáticamente al actualizar la tasa del día.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPopular = plan.popular === true;

            return (
              <article
                key={plan.id}
                className={`pricing-card relative flex flex-col ${
                  isPopular ? "pricing-card-popular" : "landing-surface"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-6 rounded-full border border-emerald-600/20 bg-emerald-600 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white dark:border-emerald-400/20 dark:bg-emerald-500 dark:text-zinc-950">
                    Recomendado
                  </span>
                )}

                <div className="flex items-start gap-3 p-6 pb-0">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isPopular
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {plan.description}
                    </p>
                  </div>
                </div>

                <div className="mx-6 my-5 border-y border-zinc-200/70 py-5 dark:border-zinc-800/70">
                  <div className="flex items-baseline gap-1.5">
                    <span className="price-usd text-3xl font-bold tracking-tight">
                      {plan.priceUsd === 0 ? "Gratis" : formatUsd(plan.priceUsd)}
                    </span>
                    {plan.priceUsd > 0 && (
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        /año
                      </span>
                    )}
                  </div>
                  <p className="price-ves mt-1.5 text-sm">
                    {plan.priceUsd === 0
                      ? "Sin costo anual"
                      : `≈ ${toVes(plan.priceUsd, exchangeRate)}/año`}
                  </p>
                </div>

                <ul className="flex flex-1 flex-col gap-2.5 px-6">
                  {plan.features.map((feature) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <li
                        key={feature.text}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <FeatureIcon className="h-3 w-3" aria-hidden="true" />
                        </span>
                        <span className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {feature.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="p-6 pt-7">
                  <Link
                    href={plan.ctaHref}
                    className={`w-full ${isPopular ? "btn-brand" : "btn-brand-outline"}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
