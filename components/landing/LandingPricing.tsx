"use client";

import Link from "next/link";
import { Check, Globe, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  ANNUAL_DOMAIN_PROMO_LABEL,
  CUSTOM_DOMAIN_FEATURE,
  FREE_SUBDOMAIN_FEATURE,
  planIncludesCustomDomain,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import { PLAN_PRICING_TIERS } from "@/src/config/plan-pricing-ui";

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
  return (
    <section
      id="precios"
      className="section-padding border-t border-zinc-200/60 dark:border-zinc-800/60"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="success" className="mb-4">
            Precios simples
          </Badge>
          <h2 className="section-title">Empieza gratis, crece cuando quieras</h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sin sorpresas ni contratos largos. El plan Gratis usa subdominio
            Alcentimo; los planes de pago incluyen dominio personalizado (.com
            incluido / conectable).
          </p>
          <p className="plan-domain-promo-banner mx-auto mt-4 max-w-xl justify-center">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{ANNUAL_DOMAIN_PROMO_LABEL} en planes anuales Pro, Business y Enterprise</span>
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          {pricingTiers.map((tier) => {
            const { price, period } = formatLandingPrice(tier);
            const ctaHref =
              tier.planId === "free"
                ? "/dashboard/productos/nuevo"
                : "/dashboard/planes";

            return (
              <li key={tier.planId} className="flex">
                <Card
                  className={`flex h-full w-full flex-col ${
                    tier.recommended
                      ? "border-emerald-300/80 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/20 dark:border-emerald-700/60 dark:ring-emerald-500/30"
                      : "border-zinc-200/80 shadow-md shadow-emerald-500/5 dark:border-zinc-800/80"
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
                        className="mb-3 w-fit border-violet-200 text-violet-800 dark:border-violet-800 dark:text-violet-200"
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
                      <li className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        {tier.productLimitLabel}
                      </li>
                      {tier.features.map((feature) => {
                        const isDomainFeature =
                          feature === CUSTOM_DOMAIN_FEATURE ||
                          feature === FREE_SUBDOMAIN_FEATURE;
                        return (
                          <li
                            key={feature}
                            className={`flex items-start gap-2.5 text-sm leading-relaxed ${
                              isDomainFeature
                                ? "font-medium text-violet-800 dark:text-violet-200"
                                : "text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            <Check
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                isDomainFeature
                                  ? "text-violet-600 dark:text-violet-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                              aria-hidden="true"
                            />
                            {feature}
                          </li>
                        );
                      })}
                    </ul>
                    <Link
                      href={ctaHref}
                      className={`mt-8 inline-flex justify-center gap-2 ${
                        tier.recommended ? "btn-brand" : "btn-brand-outline"
                      } shadow-lg shadow-emerald-500/10`}
                    >
                      {tier.planId === "free" ? "Comenzar gratis" : "Elegir plan"}
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
