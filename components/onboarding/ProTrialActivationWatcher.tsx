"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tryActivateProTrialOnSetupComplete } from "@/lib/plans/trial-actions";
import { isProTrialUnlockReady } from "@/lib/plans/trial-unlock";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import { ProTrialCongratulationsDialog } from "@/components/onboarding/ProTrialCongratulationsDialog";

interface ProTrialActivationWatcherProps {
  trialEligible: boolean;
  trialActive: boolean;
  setupStatus: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">;
}

export function ProTrialActivationWatcher({
  trialEligible,
  trialActive,
  setupStatus,
}: ProTrialActivationWatcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const activationAttempted = useRef(false);

  const setupReady = isProTrialUnlockReady(setupStatus);

  const stripTrialParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("trial")) return;
    params.delete("trial");
    const query = params.toString();
    router.replace(
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
      { scroll: false },
    );
  }, [router, searchParams]);

  const openCelebration = useCallback(
    (trialEndsAt: string) => {
      setEndsAt(trialEndsAt);
      setDialogOpen(true);
      stripTrialParam();
    },
    [stripTrialParam],
  );

  useEffect(() => {
    if (searchParams.get("trial") === "activated" && trialActive && !dialogOpen) {
      setDialogOpen(true);
      stripTrialParam();
    }
  }, [searchParams, trialActive, dialogOpen, stripTrialParam]);

  useEffect(() => {
    if (!trialEligible || trialActive || !setupReady || activationAttempted.current) {
      return;
    }

    activationAttempted.current = true;

    void tryActivateProTrialOnSetupComplete().then((result) => {
      if (!result.ok) {
        activationAttempted.current = false;
        console.error("[ProTrialActivationWatcher]", result.error);
        return;
      }

      if (result.activated) {
        openCelebration(result.endsAt);
        router.refresh();
        return;
      }

      activationAttempted.current = false;
    });
  }, [trialEligible, trialActive, setupReady, openCelebration, router]);

  return (
    <ProTrialCongratulationsDialog
      open={dialogOpen}
      endsAt={endsAt}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          stripTrialParam();
        }
      }}
    />
  );
}
