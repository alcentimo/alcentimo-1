"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AiWelcomeDialog } from "@/components/onboarding/AiWelcomeDialog";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";
import {
  isOnboardingChecklistDismissed,
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
}

export function OnboardingExperience({
  storeId,
  storeName,
  rubroLabel,
  setupStatus,
  showWelcomeFromUrl,
  trialEligible,
  trialActive,
  onOpenCreateProduct,
}: OnboardingExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [checklistVisible, setChecklistVisible] = useState(false);

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
    if (showWelcomeFromUrl) {
      setWelcomeOpen(true);
    }
    setChecklistVisible(!isOnboardingChecklistDismissed(storeId));
  }, [showWelcomeFromUrl, storeId]);

  useEffect(() => {
    function onChecklistDismissed() {
      setChecklistVisible(false);
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
  }, []);

  const showChecklist = checklistVisible;

  return (
    <>
      <Suspense fallback={null}>
        <ProTrialActivationWatcher trialActive={trialActive} />
      </Suspense>

      <AiWelcomeDialog
        open={welcomeOpen}
        storeId={storeId}
        storeName={storeName}
        rubroLabel={rubroLabel}
        onOpenChange={(open) => {
          setWelcomeOpen(open);
          if (!open) stripOnboardedParam();
        }}
        onContinue={() => {
          stripOnboardedParam();
          setChecklistVisible(true);
        }}
      />

      {showChecklist ? (
        <OnboardingChecklist
          storeId={storeId}
          setupStatus={setupStatus}
          onOpenCreateProduct={onOpenCreateProduct}
        />
      ) : null}
    </>
  );
}
