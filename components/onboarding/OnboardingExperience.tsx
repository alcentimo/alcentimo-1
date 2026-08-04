"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";
import {
  isOnboardingChecklistDismissed,
  isShareLinkStepCompleted,
  isWelcomeSeen,
  markWelcomeSeen,
} from "@/lib/onboarding/client-storage";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";

interface OnboardingExperienceProps {
  storeId: string;
  storeName: string;
  rubroLabel: string;
  setupStatus: OnboardingSetupStatus;
  showWelcomeFromUrl: boolean;
  trialEligible: boolean;
  trialActive: boolean;
  onOpenCreateProduct: () => void;
  /** Notifica si el chip de primeros pasos está visible (para no duplicar banners). */
  onChecklistVisibilityChange?: (visible: boolean) => void;
}

function isChecklistComplete(
  storeId: string,
  setupStatus: OnboardingSetupStatus,
): boolean {
  return (
    setupStatus.hasProducts &&
    setupStatus.hasPaymentsConfigured &&
    isShareLinkStepCompleted(storeId)
  );
}

export function OnboardingExperience({
  storeId,
  storeName,
  setupStatus,
  showWelcomeFromUrl,
  trialActive,
  onOpenCreateProduct,
  onChecklistVisibilityChange,
}: OnboardingExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [showWelcomeHint, setShowWelcomeHint] = useState(false);

  const stripOnboardedParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("onboarded")) return;
    params.delete("onboarded");
    const query = params.toString();
    router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
      scroll: false,
    });
  }, [router, searchParams]);

  useEffect(() => {
    const dismissed = isOnboardingChecklistDismissed(storeId);
    const complete = isChecklistComplete(storeId, setupStatus);
    const visible = !dismissed && !complete;
    setChecklistVisible(visible);
    onChecklistVisibilityChange?.(visible);

    // Primer ingreso: sin modal. Solo una pista sutil en el chip.
    if (showWelcomeFromUrl) {
      if (!isWelcomeSeen(storeId)) {
        markWelcomeSeen(storeId);
        setShowWelcomeHint(true);
      }
      stripOnboardedParam();
    }
  }, [
    showWelcomeFromUrl,
    storeId,
    setupStatus,
    stripOnboardedParam,
    onChecklistVisibilityChange,
  ]);

  useEffect(() => {
    function onChecklistDismissed() {
      setChecklistVisible(false);
      setShowWelcomeHint(false);
      onChecklistVisibilityChange?.(false);
    }
    window.addEventListener(
      "alcentimo:onboarding-checklist-dismissed",
      onChecklistDismissed,
    );
    return () => {
      window.removeEventListener(
        "alcentimo:onboarding-checklist-dismissed",
        onChecklistDismissed,
      );
    };
  }, [onChecklistVisibilityChange]);

  return (
    <>
      <Suspense fallback={null}>
        <ProTrialActivationWatcher trialActive={trialActive} />
      </Suspense>

      {checklistVisible ? (
        <OnboardingChecklist
          storeId={storeId}
          storeName={storeName}
          setupStatus={setupStatus}
          welcomeHint={showWelcomeHint}
          onOpenCreateProduct={onOpenCreateProduct}
        />
      ) : null}
    </>
  );
}
