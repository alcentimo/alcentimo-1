"use client";

import { Suspense } from "react";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";
import { ProTrialClaimForm } from "@/components/dashboard/plans/ProTrialClaimForm";
import { isProTrialUnlockReady } from "@/lib/plans/trial-unlock";
import type { ProTrialSetupPick } from "@/lib/onboarding/setup-status";

interface AjustesProTrialActivationProps {
  trialEligible: boolean;
  trialActive: boolean;
  setupStatus: ProTrialSetupPick;
}

export function AjustesProTrialActivation({
  trialEligible,
  trialActive,
  setupStatus,
}: AjustesProTrialActivationProps) {
  const unlockReady =
    trialEligible && !trialActive && isProTrialUnlockReady(setupStatus);

  return (
    <>
      <Suspense fallback={null}>
        <ProTrialActivationWatcher trialActive={trialActive} />
      </Suspense>
      {unlockReady ? (
        <section className="pro-trial-banner pro-trial-banner--unlocked">
          <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
            Requisitos de la prueba Pro completados
          </p>
          <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
            Escribe ALCENTIMO para reclamar tu mes gratis del Plan Pro.
          </p>
          <div className="mt-3">
            <ProTrialClaimForm />
          </div>
        </section>
      ) : null}
    </>
  );
}
