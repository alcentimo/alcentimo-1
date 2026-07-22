"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { PlanCheckoutDialog } from "@/components/dashboard/plans/PlanCheckoutDialog";
import {
  formatAnnualSavingsLabel,
  formatPlanPriceForTier,
  getRecommendedAnnualSavingsLabel,
  PLAN_PRICING_TIERS,
  type BillingPeriod,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import { formatProductLimit, type PlanId } from "@/src/config/plans";
import type { SubscriptionPagoMovilDetails } from "@/src/config/subscription-pago-movil";
import { formatProTrialEndsAt } from "@/lib/plans/trial";
import { cn } from "@/lib/cn";

interface PlansPanelProps {
  currentPlanId: PlanId;
  currentPlanName: string;
  productCount?: number | null;
  productLimit?: number | null;
  exchangeRate?: number | null;
  trialActive?: boolean;
  trialEndsAt?: string | null;
  subscriptionStatus?: "none" | "provisional" | "active" | string | null;
  subscriptionPeriodEndsAt?: string | null;
  currentBillingPeriod?: BillingPeriod | null;
  pagoMovil?: SubscriptionPagoMovilDetails;
  pricingTiers?: PlanPricingTier[];
}

function isCurrentTier(tierPlanId: PlanId, currentPlanId: PlanId): boolean {
  if (tierPlanId === currentPlanId) return true;
  if (tierPlanId === "premium" && currentPlanId === "growth") return true;
  return false;
}

function PlanCtaButton({
  tier,
  isCurrent,
  currentPlanId,
  onCheckout,
}: {
  tier: PlanPricingTier;
  isCurrent: boolean;
  currentPlanId: PlanId;
  onCheckout: (tier: PlanPricingTier) => void;
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
        href="/dashboard/catalogo"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
      >
        {tier.cta}
      </Link>
    );
  }

  // PRO → Business / Enterprise usa la página de upgrade con prorrateo.
  if (
    (tier.planId === "premium" || tier.planId === "enterprise") &&
    (currentPlanId === "starter" || currentPlanId === "growth")
  ) {
    return (
      <Link
        href="/dashboard/upgrade"
        className={cn(
          "btn-brand mt-6 inline-flex w-full items-center justify-center px-4 py-3.5 text-sm font-semibold shadow-sm",
          !tier.recommended && "md:py-3",
        )}
      >
        {tier.planId === "enterprise" ? "Upgrade a Enterprise" : "Upgrade a Business"}
      </Link>
    );
  }

  if (tier.planId === "enterprise" && currentPlanId === "premium") {
    return (
      <button
        type="button"
        onClick={() => onCheckout(tier)}
        className={cn(
          "btn-brand mt-6 inline-flex w-full items-center justify-center px-4 py-3.5 text-sm font-semibold shadow-sm",
          !tier.recommended && "md:py-3",
        )}
      >
        Upgrade a Enterprise
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onCheckout(tier)}
      className={cn(
        "btn-brand mt-6 inline-flex w-full items-center justify-center px-4 py-3.5 text-sm font-semibold shadow-sm",
        !tier.recommended && "md:py-3",
      )}
    >
      {tier.cta}
    </button>
  );
}

export function PlansPanel({
  currentPlanId,
  currentPlanName,
  productCount = null,
  productLimit = null,
  exchangeRate = null,
  trialActive = false,
  trialEndsAt = null,
  subscriptionStatus = null,
  subscriptionPeriodEndsAt = null,
  currentBillingPeriod = "monthly",
  pagoMovil,
  pricingTiers = PLAN_PRICING_TIERS,
}: PlansPanelProps) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<PlanPricingTier | null>(null);

  const recommendedSavings = (() => {
    const recommended = pricingTiers.find((tier) => tier.recommended);
    return recommended ? formatAnnualSavingsLabel(recommended) : getRecommendedAnnualSavingsLabel();
  })();

  function openCheckout(tier: PlanPricingTier) {
    setCheckoutTier(tier);
    setCheckoutOpen(true);
  }

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Tu plan</p>
            <p className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {currentPlanName}
            </p>
            {trialActive && trialEndsAt ? (
              <p className="mt-1 text-sm text-teal-700 dark:text-teal-300">
                Prueba Pro activa hasta el {formatProTrialEndsAt(trialEndsAt)}
              </p>
            ) : null}
            {subscriptionStatus === "provisional" ? (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Acceso provisional —{" "}
                <Link
                  href="/dashboard/pago"
                  className="font-medium underline underline-offset-2"
                >
                  ver estado de tu pago
                </Link>
              </p>
            ) : null}
            {productCount != null && productLimit != null && currentPlanId !== "premium" && currentPlanId !== "enterprise" && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {productCount} / {formatProductLimit(productLimit)} productos activos
              </p>
            )}
            {(currentPlanId === "premium" || currentPlanId === "enterprise") && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Productos ilimitados
                {currentPlanId === "enterprise" ? " · Multi-sucursal" : null}
              </p>
            )}
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
            Activo
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-teal-200/80 bg-teal-50/40 px-5 py-4 dark:border-teal-900/40 dark:bg-teal-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Globe
              className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-teal-950 dark:text-teal-100">
                Multi-sucursal con Enterprise
              </p>
              <p className="mt-1 text-sm leading-relaxed text-teal-900/90 dark:text-teal-200/90">
                Enterprise incluye hasta <strong>3 sucursales</strong>, selector de sede
                y retiro en tienda, stock por ubicación, y todo lo de Business.
                Sedes adicionales: <strong>+$6 USD/mes</strong> cada una.
              </p>
            </div>
          </div>
          <Link
            href={
              currentPlanId === "enterprise"
                ? "/dashboard/ajustes?tab=branches"
                : "#planes"
            }
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-900 transition hover:bg-teal-50 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100 dark:hover:bg-teal-900/40"
          >
            {currentPlanId === "enterprise" ? "Gestionar sucursales" : "Ver Enterprise"}
          </Link>
        </div>
      </section>

      <section>
        <div className="flex flex-col items-center gap-3 text-center">
          <BillingToggle billing={billing} onChange={setBilling} />
          {billing === "annual" && recommendedSavings && (
            <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
              {recommendedSavings} con facturación anual
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:items-end xl:gap-4">
          {pricingTiers.map((tier) => (
            <PricingCard
              key={tier.planId}
              tier={tier}
              billing={billing}
              isCurrent={isCurrentTier(tier.planId, currentPlanId)}
              currentPlanId={currentPlanId}
              onCheckout={openCheckout}
            />
          ))}
        </div>
      </section>

      <PlanCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        billing={billing}
        exchangeRate={exchangeRate}
        currentPlanId={currentPlanId}
        subscriptionPeriodEndsAt={subscriptionPeriodEndsAt}
        currentBillingPeriod={currentBillingPeriod}
        pagoMovil={pagoMovil}
        pricingTiers={pricingTiers}
      />
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
          "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          billing === "annual"
            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
        )}
      >
        Anual
        <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          -20%
        </span>
      </button>
    </div>
  );
}

function PricingCard({
  tier,
  billing,
  isCurrent,
  currentPlanId,
  onCheckout,
}: {
  tier: PlanPricingTier;
  billing: BillingPeriod;
  isCurrent: boolean;
  currentPlanId: PlanId;
  onCheckout: (tier: PlanPricingTier) => void;
}) {
  const priceLabel = formatPlanPriceForTier(tier, billing);
  const isFree = tier.monthlyUsd === 0;
  const savingsLabel =
    billing === "annual" ? formatAnnualSavingsLabel(tier) : null;
  const annualTotal =
    billing === "annual" && tier.annualUsd != null ? tier.annualUsd : null;

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
        {!isFree && billing === "annual" && annualTotal != null && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Facturado ${annualTotal} al año
          </p>
        )}
        {savingsLabel && (
          <p
            className={cn(
              "mt-2 text-xs font-semibold",
              tier.recommended
                ? "text-teal-700 dark:text-teal-400"
                : "text-neutral-600 dark:text-neutral-400",
            )}
          >
            {savingsLabel}
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

      {tier.addonNote ? (
        <p className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          {tier.addonNote}
        </p>
      ) : null}

      <PlanCtaButton
        tier={tier}
        isCurrent={isCurrent}
        currentPlanId={currentPlanId}
        onCheckout={onCheckout}
      />
    </article>
  );
}
