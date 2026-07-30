"use client";

import { Suspense, useEffect, useState } from "react";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";
import { ProTrialBanner } from "@/components/dashboard/plans/ProTrialBanner";
import { ProTrialClaimModal } from "@/components/dashboard/plans/ProTrialClaimModal";
import { isProTrialUnlockReady } from "@/lib/plans/trial-unlock";
import type { ProTrialSetupPick } from "@/lib/onboarding/setup-status";

interface AjustesProTrialActivationProps {
  trialEligible: boolean;
  trialActive: boolean;
  trialEndsAt?: string | null;
  setupStatus: ProTrialSetupPick;
}

export function AjustesProTrialActivation({
  trialEligible,
  trialActive,
  trialEndsAt = null,
  setupStatus,
}: AjustesProTrialActivationProps) {
  const unlockReady =
    trialEligible && !trialActive && isProTrialUnlockReady(setupStatus);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  useEffect(() => {
    if (unlockReady) {
      setClaimModalOpen(true);
    }
  }, [unlockReady]);

  if (!trialEligible && !trialActive) {
    return null;
  }

  // Si aún no está listo el desbloqueo, el banner completo ya muestra progreso.
  // En ajustes solo forzamos el modal de reclamación cuando corresponde.
  if (unlockReady) {
    return (
      <>
        <Suspense fallback={null}>
          <ProTrialActivationWatcher trialActive={trialActive} />
        </Suspense>
        <section className="pro-trial-banner pro-trial-banner--unlocked">
          <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
            Requisitos de la prueba Pro completados
          </p>
          <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
            Confirma escribiendo ALCENTIMO para reclamar tu mes gratis.
          </p>
          <button
            type="button"
            className="pro-trial-banner-cta mt-3"
            onClick={() => setClaimModalOpen(true)}
          >
            Abrir confirmación
          </button>
        </section>
        <ProTrialClaimModal
          open={claimModalOpen}
          onOpenChange={setClaimModalOpen}
        />
      </>
    );
  }

  if (trialEligible || trialActive) {
    return (
      <ProTrialBanner
        showBanner
        trialEligible={trialEligible}
        trialActive={trialActive}
        trialEndsAt={trialEndsAt}
        setupStatus={setupStatus}
        autoOpenClaimModal={false}
      />
    );
  }

  return null;
}
