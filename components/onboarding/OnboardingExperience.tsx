"use client";

import { useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";
import { trackMetaCompleteRegistrationOnce } from "@/lib/analytics/meta-pixel";
import { isWelcomeSeen, markWelcomeSeen } from "@/lib/onboarding/client-storage";

interface OnboardingExperienceProps {
  storeId: string;
  showWelcomeFromUrl: boolean;
  trialActive: boolean;
}

/**
 * Onboarding ligero del catálogo: limpia ?onboarded= y observa activación Pro.
 * También dispara CompleteRegistration (Meta Pixel) en el primer ingreso al panel.
 */
export function OnboardingExperience({
  storeId,
  showWelcomeFromUrl,
  trialActive,
}: OnboardingExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    if (!showWelcomeFromUrl) return;

    // Primer ingreso al panel tras completar el alta (no se dispara en logins posteriores).
    trackMetaCompleteRegistrationOnce({
      content_name: "merchant_onboarding",
      status: true,
    });

    if (!isWelcomeSeen(storeId)) {
      markWelcomeSeen(storeId);
    }
    stripOnboardedParam();
  }, [showWelcomeFromUrl, storeId, stripOnboardedParam]);

  return (
    <Suspense fallback={null}>
      <ProTrialActivationWatcher trialActive={trialActive} />
    </Suspense>
  );
}
