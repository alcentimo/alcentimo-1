import Link from "next/link";
import { formatExchangeRate, formatUsd, formatVes } from "@/lib/format";
import {
  formatProductLimit,
  isUnlimitedProductLimit,
  PLAN_LIST,
  PLANS,
  type PlanId,
} from "@/src/config/plans";

interface LandingPricingProps {
  exchangeRate: number | null;
}

function planCta(planId: PlanId): { label: string; href: string; primary: boolean } {
  if (planId === "free") {
    return {
      label: "Comenzar gratis",
      href: "/dashboard/productos/nuevo",
      primary: true,
    };
  }

  return {
    label: "Ver en el panel",
    href: "/dashboard/planes",
    primary: false,
  };
}

function toVes(usd: number, rate: number | null): string | null {
  if (rate == null || usd <= 0) return null;
  return formatVes(usd * rate);
}

export function LandingPricing({ exchangeRate }: LandingPricingProps) {
  return (
    <section
      id="precios"
      className="section-padding border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container max-w-4xl">
        <div className="max-w-xl">
          <p className="section-label">Planes</p>
          <h2 className="section-title mt-3">Precios simples, en USD</h2>
          <p className="section-subtitle mt-3">
            Mismas funcionalidades en todos los planes. Solo cambia cuántos
            productos puedes publicar.
          </p>
        </div>

        <ul className="mt-10 divide-y divide-zinc-200/70 rounded-[12px] border border-zinc-200/70 bg-[#FAFAF9] dark:divide-zinc-800/70 dark:border-zinc-800/70 dark:bg-zinc-950">
          {PLAN_LIST.map((plan) => {
            const definition = PLANS[plan.id];
            const cta = planCta(plan.id);
            const vesEquivalent = toVes(definition.priceUsdYearly, exchangeRate);

            return (
              <li
                key={plan.id}
                className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {definition.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {isUnlimitedProductLimit(definition.productLimit)
                      ? "Productos ilimitados"
                      : `Hasta ${formatProductLimit(definition.productLimit)} productos`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                  <p className="font-mono text-lg font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                    {definition.priceUsdYearly === 0
                      ? "Gratis"
                      : `${formatUsd(definition.priceUsdYearly)}/año`}
                  </p>
                  {vesEquivalent ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      ≈ {vesEquivalent}/año
                    </p>
                  ) : null}
                </div>

                <Link
                  href={cta.href}
                  className={`shrink-0 ${cta.primary ? "btn-brand px-4" : "btn-brand-outline px-4"}`}
                >
                  {cta.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {exchangeRate != null ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Equivalente en bolívares referencial (Bs. {formatExchangeRate(exchangeRate)}{" "}
            / USD). Los precios de tu catálogo se actualizan con la tasa del día.
          </p>
        ) : null}
      </div>
    </section>
  );
}
