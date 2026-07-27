"use client";

import { Suspense } from "react";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";

interface AjustesProTrialActivationProps {
  trialEligible: boolean;
  trialActive: boolean;
  setupStatus: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">;
}

export function AjustesProTrialActivation({
  trialEligible,
  trialActive,
  setupStatus,
}: AjustesProTrialActivationProps) {
  return (
    <Suspense fallback={null}>
      <ProTrialActivationWatcher
        trialEligible={trialEligible}
        trialActive={trialActive}
        setupStatus={setupStatus}
      />
    </Suspense>
  );
}
