"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startProTrial } from "@/lib/plans/trial-actions";
import { PRO_TRIAL_CLAIM_CODE } from "@/lib/plans/trial";
import { persistProTrialCongrats } from "@/lib/plans/pro-trial-congrats-storage";
import { requestDashboardShellRefresh } from "@/lib/dashboard/shell-refresh";

interface ProTrialClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Modal de seguridad: exige escribir ALCENTIMO para reclamar el mes Pro gratis. */
export function ProTrialClaimModal({
  open,
  onOpenChange,
}: ProTrialClaimModalProps) {
  const router = useRouter();
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetClaimState() {
    setClaimCode("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetClaimState();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await startProTrial(claimCode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Persiste la felicitación para que sobreviva al refresh y no se cierre sola.
      persistProTrialCongrats(result.endsAt);
      handleOpenChange(false);
      requestDashboardShellRefresh();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
            <Gift className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Prueba Plan Profesional
            </span>
          </div>
          <DialogTitle>Reclama tu mes gratis</DialogTitle>
          <DialogDescription>
            Completaste los requisitos de tu tienda. Escribe obligatoriamente{" "}
            <strong>{PRO_TRIAL_CLAIM_CODE}</strong> para desbloquear 30 días
            gratis del Plan Profesional ($8).
          </DialogDescription>
        </DialogHeader>

        <form className="pro-trial-claim mt-2" onSubmit={handleSubmit}>
          <label htmlFor="pro-trial-claim-modal-code" className="pro-trial-claim-label">
            Palabra de confirmación
          </label>
          <input
            id="pro-trial-claim-modal-code"
            name="claimCode"
            type="text"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={claimCode}
            onChange={(event) => {
              setClaimCode(event.target.value);
              if (error) setError(null);
            }}
            placeholder={`Escribe ${PRO_TRIAL_CLAIM_CODE}`}
            className="pro-trial-claim-input"
            disabled={isPending}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? "pro-trial-claim-modal-error" : "pro-trial-claim-modal-hint"
            }
          />
          <p id="pro-trial-claim-modal-hint" className="pro-trial-claim-hint">
            Debe coincidir exactamente. La prueba no se activa sola.
          </p>
          {error ? (
            <p
              id="pro-trial-claim-modal-error"
              className="pro-trial-claim-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="pro-trial-banner-cta w-full sm:w-full"
            disabled={isPending || claimCode.trim().length === 0}
          >
            {isPending ? "Reclamando…" : "Desbloquear mes gratis"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
