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
  PRICING_DOMAIN_DISCLAIMER,
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
  subscriptionPeriodStartedAt?: string | null;
  subscriptionPeriodEndsAt?: string | null;
  currentBillingPeriod?: BillingPeriod | null;
  pagoMovil?: SubscriptionPagoMovilDetails;
  pricingTiers?: PlanPricingTier[];
  /** Oculta el campo de cupón en el checkout cuando el admin lo desactiva. */
  showCouponField?: boolean;
  /** Vista limpia de activación: sin bloques auxiliares encima de las tarjetas. */
  variant?: "default" | "activation";
}

function formatSubscriptionDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatProTrialEndsAt(value);
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
  trialActive = false,
  onCheckout,
}: {
  tier: PlanPricingTier;
  isCurrent: boolean;
  currentPlanId: PlanId;
  trialActive?: boolean;
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

  // PRO de pago → Business: prorrateo en /dashboard/upgrade.
  // Prueba Pro / Enterprise: checkout manual (evita 404 y flujos no elegibles).
  const isProFamily =
    currentPlanId === "starter" || currentPlanId === "growth";
  if (
    (tier.planId === "premium" || tier.planId === "enterprise") &&
    isProFamily
  ) {
    const useBusinessProration =
      tier.planId === "premium" && !trialActive && currentPlanId === "starter";

    if (useBusinessProration) {
      return (
        <Link
          href="/dashboard/upgrade"
          className={cn(
            "btn-brand mt-6 inline-flex w-full items-center justify-center px-4 py-3.5 text-sm font-semibold shadow-sm",
            !tier.recommended && "md:py-3",
          )}
        >
          Upgrade a Business
        </Link>
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
        {tier.planId === "enterprise"
          ? "Upgrade a Enterprise"
          : "Upgrade a Business"}
      </button>
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
  subscriptionPeriodStartedAt = null,
  subscriptionPeriodEndsAt = null,
  currentBillingPeriod = "monthly",
  pagoMovil,
  pricingTiers = PLAN_PRICING_TIERS,
  showCouponField = true,
  variant = "default",
}: PlansPanelProps) {
  const isActivation = variant === "activation";
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<PlanPricingTier | null>(null);

  const recommendedSavings = (() => {
    const recommended = pricingTiers.find((tier) => tier.recommended);
    return recommended ? formatAnnualSavingsLabel(recommended) : getRecommendedAnnualSavingsLabel();
  })();

  const isPaidActive =
    subscriptionStatus === "active" && currentPlanId !== "free";
  const startedAtLabel = formatSubscriptionDate(subscriptionPeriodStartedAt);
  const endsAtLabel = formatSubscriptionDate(subscriptionPeriodEndsAt);
  const renewalLabel =
    currentBillingPeriod === "annual"
      ? "Próxima renovación anual"
      : "Próximo corte mensual";

  const statusBadge =
    subscriptionStatus === "provisional"
      ? {
          label: "Provisional",
          className:
            "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
        }
      : trialActive
        ? {
            label: "Prueba activa",
            className:
              "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
          }
        : {
            label: "Activo",
            className:
              "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
          };

  function openCheckout(tier: PlanPricingTier) {
    setCheckoutTier(tier);
    setCheckoutOpen(true);
  }

  return (
    <div className={cn("space-y-10", isActivation && "activar-plans-panel")}>
      {!isActivation ? (
        <section className="rounded-xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
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
              {productCount != null && productLimit != null && currentPlanId !== "enterprise" && (
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {productCount} / {formatProductLimit(productLimit)} productos activos
                </p>
              )}
              {currentPlanId === "enterprise" && (
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Productos ilimitados · Multi-sucursal
                </p>
              )}

              {isPaidActive && (startedAtLabel || endsAtLabel) ? (
                <dl className="mt-3 grid gap-2 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800 sm:grid-cols-2">
                  {startedAtLabel ? (
                    <div>
                      <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                        Inicio de suscripción
                      </dt>
                      <dd className="mt-0.5 font-medium text-neutral-800 dark:text-neutral-100">
                        {startedAtLabel}
                      </dd>
                    </div>
                  ) : null}
                  {endsAtLabel ? (
                    <div>
                      <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                        {renewalLabel}
                      </dt>
                      <dd className="mt-0.5 font-medium text-neutral-800 dark:text-neutral-100">
                        {endsAtLabel}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
            <span
              className={cn(
                "inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium",
                statusBadge.className,
              )}
            >
              {statusBadge.label}
            </span>
          </div>
        </section>
      ) : null}

      {isActivation ? (
        <section className="rounded-xl border border-violet-200/80 bg-violet-50/40 px-5 py-4 dark:border-violet-900/40 dark:bg-violet-950/20">
          <div className="flex items-start gap-3">
            <Globe
              className="mt-0.5 h-5 w-5 shrink-0 text-violet-700 dark:text-violet-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">
                Todos los planes de pago: conecta tu dominio propio
              </p>
              <p className="mt-1 text-sm leading-relaxed text-violet-900/90 dark:text-violet-200/90">
                {PRICING_DOMAIN_DISCLAIMER}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section id="planes" className={cn(isActivation && "activar-plans-section")}>
        <div
          className={cn(
            "flex flex-col items-center gap-3 text-center",
            isActivation && "activar-plans-billing-toggle",
          )}
        >
          <BillingToggle billing={billing} onChange={setBilling} />
          {billing === "annual" && recommendedSavings && (
            <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
              {recommendedSavings} con facturación anual
            </p>
          )}
        </div>

        <div
          className={cn(
            "mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:items-end xl:gap-4",
            isActivation &&
              "activar-plans-grid mt-10 gap-6 pt-2 sm:gap-6 xl:gap-6 xl:pt-4",
          )}
        >
          {pricingTiers.map((tier) => (
            <PricingCard
              key={tier.planId}
              tier={tier}
              billing={billing}
              isCurrent={isCurrentTier(tier.planId, currentPlanId)}
              currentPlanId={currentPlanId}
              trialActive={trialActive}
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
        showCouponField={showCouponField}
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
  trialActive = false,
  onCheckout,
}: {
  tier: PlanPricingTier;
  billing: BillingPeriod;
  isCurrent: boolean;
  currentPlanId: PlanId;
  trialActive?: boolean;
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
          ? "z-10 border-teal-500 shadow-lg ring-2 ring-teal-500/25 md:scale-[1.03] md:px-7 md:py-8"
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

      <PlanCtaButton
        tier={tier}
        isCurrent={isCurrent}
        currentPlanId={currentPlanId}
        trialActive={trialActive}
        onCheckout={onCheckout}
      />
    </article>
  );
}
