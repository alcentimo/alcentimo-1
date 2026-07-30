"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Sparkles, Lock } from "lucide-react";
import { formatProTrialEndsAt } from "@/lib/plans/trial";
import {
  formatProTrialSetupRemainingMessage,
  isProTrialUnlockReady,
} from "@/lib/plans/trial-unlock";
import type { ProTrialSetupPick } from "@/lib/onboarding/setup-status";
import { ProTrialSetupProgress } from "@/components/dashboard/plans/ProTrialSetupProgress";
import { ProTrialClaimForm } from "@/components/dashboard/plans/ProTrialClaimForm";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";

interface ProTrialBannerProps {
  showBanner: boolean;
  trialEligible: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  setupStatus: ProTrialSetupPick;
}

export function ProTrialBanner({
  showBanner,
  trialEligible,
  trialActive,
  trialEndsAt,
  setupStatus,
}: ProTrialBannerProps) {
  if (!showBanner) {
    return null;
  }

  const unlockReady = isProTrialUnlockReady(setupStatus);

  let banner: React.ReactNode = null;

  if (trialActive) {
    banner = (
      <section className="pro-trial-banner pro-trial-banner--active">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              Prueba Pro activa
            </p>
            <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
              Publica hasta 250 productos hasta el{" "}
              {formatProTrialEndsAt(trialEndsAt)}.
            </p>
          </div>
        </div>
        <Link href="/dashboard/catalogo" className="pro-trial-banner-cta">
          Ir al catálogo
        </Link>
      </section>
    );
  } else if (trialEligible && !unlockReady) {
    banner = (
      <section className="pro-trial-banner pro-trial-banner--locked" aria-disabled="true">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Prueba Pro — 30 días gratis
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {formatProTrialSetupRemainingMessage(setupStatus)}
            </p>
          </div>
        </div>

        <ProTrialSetupProgress setup={setupStatus} />

        <div className="mt-3 flex flex-wrap gap-3">
          {!setupStatus.hasMinProductsForProTrial ? (
            <Link href="/dashboard/catalogo?nuevo=1" className="pro-trial-banner-link">
              Añadir productos
            </Link>
          ) : null}
          {!setupStatus.hasPaymentsConfigured ? (
            <Link
              href="/dashboard/ajustes?tab=payments"
              className="pro-trial-banner-link"
            >
              Configurar pagos
            </Link>
          ) : null}
          {!setupStatus.hasShippingConfigured ? (
            <Link
              href="/dashboard/ajustes?tab=shipping"
              className="pro-trial-banner-link"
            >
              Configurar envíos
            </Link>
          ) : null}
        </div>
      </section>
    );
  } else if (trialEligible && unlockReady) {
    banner = (
      <section className="pro-trial-banner pro-trial-banner--unlocked">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              Requisitos completados
            </p>
            <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
              Confirma escribiendo ALCENTIMO para reclamar tu mes gratis del Plan
              Pro.
            </p>
          </div>
        </div>
        <ProTrialSetupProgress setup={setupStatus} />
        <div className="mt-3">
          <ProTrialClaimForm />
        </div>
      </section>
    );
  }

  if (!banner) {
    return null;
  }

  return (
    <>
      {trialEligible || trialActive ? (
        <Suspense fallback={null}>
          <ProTrialActivationWatcher trialActive={trialActive} />
        </Suspense>
      ) : null}
      {banner}
    </>
  );
}
