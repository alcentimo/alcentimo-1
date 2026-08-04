"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { ProTrialClaimModal } from "@/components/dashboard/plans/ProTrialClaimModal";
import {
  getProTrialSetupProgressPercent,
  isProTrialUnlockReady,
} from "@/lib/plans/trial-unlock";
import {
  PRO_TRIAL_MIN_ACTIVE_PRODUCTS,
  type ProTrialSetupPick,
} from "@/lib/onboarding/setup-status";
import { cn } from "@/lib/cn";

interface SidebarProTrialProgressProps {
  setup: ProTrialSetupPick;
  trialEligible: boolean;
  trialActive: boolean;
  expanded: boolean;
}

const STEPS = [
  {
    key: "products" as const,
    short: `${PRO_TRIAL_MIN_ACTIVE_PRODUCTS} productos`,
    href: "/dashboard/catalogo?nuevo=1",
  },
  {
    key: "payments" as const,
    short: "Método de pago",
    href: "/dashboard/ajustes?tab=payments",
  },
  {
    key: "shipping" as const,
    short: "Método de envío",
    href: "/dashboard/ajustes?tab=shipping",
  },
] as const;

function stepDone(setup: ProTrialSetupPick, key: (typeof STEPS)[number]["key"]) {
  if (key === "products") return setup.hasMinProductsForProTrial;
  if (key === "payments") return setup.hasPaymentsConfigured;
  return setup.hasShippingConfigured;
}

/**
 * Progreso de la prueba Pro en la sidebar (debajo del plan).
 * No es flotante: no tapa el catálogo.
 */
export function SidebarProTrialProgress({
  setup,
  trialEligible,
  trialActive,
  expanded,
}: SidebarProTrialProgressProps) {
  const [claimOpen, setClaimOpen] = useState(false);

  if (!trialEligible || trialActive) {
    return null;
  }

  const completed =
    (setup.hasMinProductsForProTrial ? 1 : 0) +
    (setup.hasPaymentsConfigured ? 1 : 0) +
    (setup.hasShippingConfigured ? 1 : 0);
  const percent = getProTrialSetupProgressPercent(setup);
  const unlockReady = isProTrialUnlockReady(setup);
  const summary = `Primeros pasos Pro ${completed}/3`;

  if (!expanded) {
    return (
      <div
        className="flex flex-col items-center gap-1 py-1"
        title={summary}
        aria-label={summary}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold",
            unlockReady
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
          )}
        >
          {completed}/3
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label={summary}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">
          <Sparkles
            className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span className="truncate">Primeros pasos</span>
        </p>
        <span className="shrink-0 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          {completed}/3
        </span>
      </div>

      <div
        className="mb-2 h-1 w-full overflow-hidden rounded-full bg-zinc-200/90 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso hacia prueba Pro: ${completed} de 3`}
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 dark:bg-emerald-400"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="space-y-1">
        {STEPS.map((step) => {
          const done = stepDone(setup, step.key);
          return (
            <li key={step.key}>
              <Link
                href={done ? "#" : step.href}
                onClick={(event) => {
                  if (done) event.preventDefault();
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] leading-snug transition-colors",
                  done
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                )}
                aria-current={done ? undefined : undefined}
              >
                {done ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                )}
                <span className={cn("truncate", done && "line-through decoration-emerald-600/40")}>
                  {step.short}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {unlockReady ? (
        <button
          type="button"
          className="btn-brand mt-2 !min-h-8 w-full !px-2 !text-[11px]"
          onClick={() => setClaimOpen(true)}
        >
          Reclamar mes Pro gratis
        </button>
      ) : (
        <p className="mt-1.5 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
          Completa los 3 pasos y desbloquea 30 días de Plan Pro.
        </p>
      )}

      <ProTrialClaimModal open={claimOpen} onOpenChange={setClaimOpen} />
    </div>
  );
}
