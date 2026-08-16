import Link from "next/link";
import { Check, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  LANDING_PLAN_IDS,
  planIncludesCustomDomain,
  PRICING_DOMAIN_DISCLAIMER,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import { PLAN_PRICING_TIERS } from "@/src/config/plan-pricing-ui";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";

function formatLandingPrice(tier: PlanPricingTier): {
  price: string;
  period: string;
} {
  if (tier.monthlyUsd <= 0) {
    return { price: "$0", period: "" };
  }
  const value = Number.isInteger(tier.monthlyUsd)
    ? String(tier.monthlyUsd)
    : tier.monthlyUsd.toFixed(2);
  return { price: `$${value}`, period: "/mes" };
}

interface LandingPricingProps {
  pricingTiers?: PlanPricingTier[];
}

export function LandingPricing({
  pricingTiers = PLAN_PRICING_TIERS,
}: LandingPricingProps) {
  const visibleTiers = pricingTiers.filter((tier) =>
    LANDING_PLAN_IDS.includes(tier.planId),
  );

  return (
    <section
      id="precios"
      className="section-padding border-t border-zinc-200/60 dark:border-zinc-800/60"
    >
      <div className="page-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label">Precios</p>
          <h2 className="section-title">
            Planes simples para empezar
          </h2>
          <p className="section-subtitle mx-auto">
            Tres opciones claras. Sin comisiones por venta.
          </p>
          <p className="landing-pricing-disclaimer mt-5 text-left sm:text-center">
            {PRICING_DOMAIN_DISCLAIMER}
          </p>
        </div>

        <ul className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-8">
          {visibleTiers.map((tier) => {
            const { price, period } = formatLandingPrice(tier);
            const ctaHref =
              tier.planId === "free"
                ? MERCHANT_SIGNUP_HREF
                : "/dashboard/planes";

            return (
              <li key={tier.planId} className="flex">
                <Card
                  className={`flex h-full w-full flex-col ${
                    tier.recommended
                      ? "border-emerald-300/70 shadow-sm ring-1 ring-emerald-500/15 dark:border-emerald-700/60 dark:ring-emerald-500/25"
                      : "border-zinc-200/80 shadow-none dark:border-zinc-800/80"
                  }`}
                >
                  <CardHeader className="pb-2 pt-6 sm:px-6">
                    {tier.recommended ? (
                      <Badge variant="success" className="mb-3 w-fit">
                        Más popular
                      </Badge>
                    ) : null}
                    {planIncludesCustomDomain(tier.planId) ? (
                      <Badge
                        variant="outline"
                        className="mb-3 w-fit border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-200"
                      >
                        <Globe className="mr-1 h-3 w-3" aria-hidden="true" />
                        Dominio .com
                      </Badge>
                    ) : null}
                    <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {tier.displayName}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {tier.tagline}
                    </p>
                    <p className="mt-5 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {price}
                      </span>
                      {period ? (
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          {period}
                        </span>
                      ) : null}
                    </p>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col pb-6 sm:px-6">
                    <ul className="flex flex-1 flex-col gap-3 border-t border-zinc-200/70 pt-5 dark:border-zinc-800/70">
                      {tier.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                        >
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={ctaHref}
                      className={`mt-8 inline-flex justify-center gap-2 ${
                        tier.recommended ? "btn-brand" : "btn-brand-outline"
                      }`}
                    >
                      {tier.planId === "free"
                        ? "Quiero vender"
                        : "Elegir plan"}
                    </Link>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
