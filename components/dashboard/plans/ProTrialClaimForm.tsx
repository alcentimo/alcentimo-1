"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startProTrial } from "@/lib/plans/trial-actions";
import { PRO_TRIAL_CLAIM_CODE } from "@/lib/plans/trial";
import { ProTrialCongratulationsDialog } from "@/components/onboarding/ProTrialCongratulationsDialog";

interface ProTrialClaimFormProps {
  idPrefix?: string;
  /** Si false, solo notifica el éxito (p. ej. modal externo). Default true. */
  showCongratulations?: boolean;
  onClaimed?: (endsAt: string) => void;
}

/** Formulario reutilizable para reclamar la prueba Pro escribiendo ALCENTIMO. */
export function ProTrialClaimForm({
  idPrefix = "pro-trial-claim",
  showCongratulations = true,
  onClaimed,
}: ProTrialClaimFormProps) {
  const router = useRouter();
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputId = `${idPrefix}-code`;
  const hintId = `${idPrefix}-hint`;
  const errorId = `${idPrefix}-error`;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await startProTrial(claimCode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEndsAt(result.endsAt);
      onClaimed?.(result.endsAt);
      if (showCongratulations) {
        setDialogOpen(true);
      }
      router.refresh();
    });
  }

  return (
    <>
      <form className="pro-trial-claim" onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="pro-trial-claim-label">
          Escribe <strong>{PRO_TRIAL_CLAIM_CODE}</strong> para desbloquear y
          reclamar tu mes gratis del Plan Pro.
        </label>
        <input
          id={inputId}
          name="claimCode"
          type="text"
          autoComplete="off"
          spellCheck={false}
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
          aria-describedby={error ? errorId : hintId}
        />
        <p id={hintId} className="pro-trial-claim-hint">
          La palabra es obligatoria. No se activa automáticamente.
        </p>
        {error ? (
          <p id={errorId} className="pro-trial-claim-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="pro-trial-banner-cta"
          disabled={isPending || claimCode.trim().length === 0}
        >
          {isPending ? "Reclamando…" : "Reclamar mes gratis"}
        </button>
      </form>

      {showCongratulations ? (
        <ProTrialCongratulationsDialog
          open={dialogOpen}
          endsAt={endsAt}
          onOpenChange={setDialogOpen}
        />
      ) : null}
    </>
  );
}
