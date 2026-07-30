"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProTrialCongratulationsDialog } from "@/components/onboarding/ProTrialCongratulationsDialog";

interface ProTrialActivationWatcherProps {
  trialActive: boolean;
}

/**
 * Solo celebra si la URL trae ?trial=activated (p. ej. deep-link post-claim).
 * La activación ya no es automática: el usuario debe reclamar con ALCENTIMO.
 */
export function ProTrialActivationWatcher({
  trialActive,
}: ProTrialActivationWatcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);

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

  useEffect(() => {
    if (searchParams.get("trial") === "activated" && trialActive && !dialogOpen) {
      setDialogOpen(true);
      stripTrialParam();
    }
  }, [searchParams, trialActive, dialogOpen, stripTrialParam]);

  return (
    <ProTrialCongratulationsDialog
      open={dialogOpen}
      endsAt={null}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          stripTrialParam();
        }
      }}
    />
  );
}
