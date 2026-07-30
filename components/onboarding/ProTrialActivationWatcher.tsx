"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProTrialCongratulationsDialog } from "@/components/onboarding/ProTrialCongratulationsDialog";
import {
  clearProTrialCongrats,
  PRO_TRIAL_CONGRATS_EVENT,
  readProTrialCongrats,
} from "@/lib/plans/pro-trial-congrats-storage";

interface ProTrialActivationWatcherProps {
  trialActive: boolean;
}

const HOST_FLAG = "__alcentimoProTrialCongratsHost";

/**
 * Muestra el modal de felicitaciones de forma persistente hasta cierre manual.
 * Fuentes: sessionStorage (tras reclamar ALCENTIMO) o ?trial=activated.
 * Solo un host renderiza el diálogo si hay varios watchers montados.
 */
export function ProTrialActivationWatcher({
  trialActive,
}: ProTrialActivationWatcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHost, setIsHost] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  useEffect(() => {
    const win = window as Window & { [HOST_FLAG]?: boolean };
    if (win[HOST_FLAG]) {
      setIsHost(false);
      return;
    }
    win[HOST_FLAG] = true;
    setIsHost(true);
    return () => {
      delete win[HOST_FLAG];
    };
  }, []);

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

  const openFromStorage = useCallback(() => {
    const stored = readProTrialCongrats();
    if (!stored) return;
    setEndsAt(stored.endsAt);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!isHost) return;

    openFromStorage();

    if (searchParams.get("trial") === "activated" && trialActive) {
      setDialogOpen(true);
      stripTrialParam();
    }

    function onCongratsEvent() {
      openFromStorage();
    }

    window.addEventListener(PRO_TRIAL_CONGRATS_EVENT, onCongratsEvent);
    return () => {
      window.removeEventListener(PRO_TRIAL_CONGRATS_EVENT, onCongratsEvent);
    };
  }, [isHost, searchParams, trialActive, stripTrialParam, openFromStorage]);

  function handleOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      clearProTrialCongrats();
      stripTrialParam();
    }
  }

  if (!isHost) return null;

  return (
    <ProTrialCongratulationsDialog
      open={dialogOpen}
      endsAt={endsAt}
      onOpenChange={handleOpenChange}
    />
  );
}
