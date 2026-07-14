"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import {
  ANNUAL_BILLING_DISCOUNT,
  formatPlanPrice,
  PLAN_PRICING_TIERS,
  type BillingPeriod,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import { formatProductLimit, type PlanId } from "@/src/config/plans";
import { cn } from "@/lib/cn";

interface PlansPanelProps {
  currentPlanId: PlanId;
  currentPlanName: string;
  productCount?: number | null;
  productLimit?: number | null;
}

const SALES_EMAIL = "info@alcentimo.com";

function buildUpgradeMailto(planName: string, billing: BillingPeriod): string {
  const periodLabel = billing === "annual" ? "anual" : "mensual";
  const subject = encodeURIComponent(`Plan ${planName} (${periodLabel})`);
  return `mailto:${SALES_EMAIL}?subject=${subject}`;
}

function isCurrentTier(tierPlanId: PlanId, currentPlanId: PlanId): boolean {
  if (tierPlanId === currentPlanId) return true;
  // Plan legacy Growth se agrupa con Business en la UI
  if (tierPlanId === "premium" && currentPlanId === "growth") return true;
  return false;
}

function PlanCtaButton({
  tier,
  billing,
  isCurrent,
}: {
  tier: PlanPricingTier;
  billing: BillingPeriod;
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <button
        type="button"
        disabled
        className="mt-6 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
      >
        Plan actual
      </button>
    );
  }

  if (tier.planId === "free") {
    return (
      <Link
        href="/dashboard"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
      >
        {tier.cta}
      </Link>
    );
  }

  if (tier.recommended) {
    return (
      <a
        href={buildUpgradeMailto(tier.displayName, billing)}
        className="btn-brand mt-6 inline-flex w-full items-center justify-center px-4 py-3.5 text-sm font-semibold shadow-sm"
      >
        {tier.cta}
      </a>
    );
  }

  return (
    <a
      href={tier.contactSales ? buildUpgradeMailto(tier.displayName, billing) : "/dashboard"}
      className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:border-neutral-600"
    >
      {tier.cta}
    </a>
  );
}

export function PlansPanel({
  currentPlanId,
  currentPlanName,
  productCount = null,
  productLimit = null,
}: PlansPanelProps) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Tu plan</p>
            <p className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {currentPlanName}
            </p>
            {productCount != null && productLimit != null && currentPlanId !== "premium" && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {productCount} / {formatProductLimit(productLimit)} productos activos
              </p>
            )}
            {currentPlanId === "premium" && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Productos ilimitados
              </p>
            )}
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
            Activo
          </span>
        </div>
      </section>

      <section>
        <div className="flex flex-col items-center gap-4 text-center">
          <BillingToggle billing={billing} onChange={setBilling} />
          {billing === "annual" && (
            <p className="text-xs text-teal-700 dark:text-teal-400">
              Ahorra {Math.round(ANNUAL_BILLING_DISCOUNT * 100)}% pagando anual
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-5 md:grid-cols-3 md:items-end md:gap-4 lg:gap-6">
          {PLAN_PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.planId}
              tier={tier}
              billing={billing}
              isCurrent={isCurrentTier(tier.planId, currentPlanId)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900"
      role="group"
      aria-label="Periodo de facturación"
    >
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          billing === "monthly"
            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
        )}
      >
        Mensual
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          billing === "annual"
            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
        )}
      >
        Anual
      </button>
    </div>
  );
}

function PricingCard({
  tier,
  billing,
  isCurrent,
}: {
  tier: PlanPricingTier;
  billing: BillingPeriod;
  isCurrent: boolean;
}) {
  const priceLabel = formatPlanPrice(tier.monthlyUsd, billing);
  const isFree = tier.monthlyUsd === 0;

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white p-6 dark:bg-neutral-950",
        tier.recommended
          ? "z-10 border-teal-500 shadow-md ring-2 ring-teal-500/25 md:scale-[1.04] md:px-7 md:py-8"
          : "border-neutral-200 dark:border-neutral-800",
        isCurrent && !tier.recommended && "ring-1 ring-neutral-300 dark:ring-neutral-700",
      )}
    >
      {tier.recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-teal-600 px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
          Opción recomendada
        </span>
      )}

      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {tier.displayName}
        </h3>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{tier.tagline}</p>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {priceLabel}
          </span>
          {!isFree && (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">/mes</span>
          )}
        </div>
        {!isFree && billing === "annual" && (
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            Facturado anualmente
          </p>
        )}
        <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {tier.productLimitLabel}
        </p>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400"
          >
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400"
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <PlanCtaButton tier={tier} billing={billing} isCurrent={isCurrent} />
    </article>
  );
}
