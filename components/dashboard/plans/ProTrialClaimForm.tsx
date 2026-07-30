"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startProTrial } from "@/lib/plans/trial-actions";
import { PRO_TRIAL_CLAIM_CODE } from "@/lib/plans/trial";
import { ProTrialCongratulationsDialog } from "@/components/onboarding/ProTrialCongratulationsDialog";

export function ProTrialClaimForm() {
  const router = useRouter();
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      setDialogOpen(true);
      router.refresh();
    });
  }

  return (
    <>
      <form className="pro-trial-claim" onSubmit={handleSubmit}>
        <label htmlFor="pro-trial-claim-code" className="pro-trial-claim-label">
          Escribe <strong>{PRO_TRIAL_CLAIM_CODE}</strong> para desbloquear y
          reclamar tu mes gratis del Plan Pro.
        </label>
        <input
          id="pro-trial-claim-code"
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
          aria-describedby={error ? "pro-trial-claim-error" : "pro-trial-claim-hint"}
        />
        <p id="pro-trial-claim-hint" className="pro-trial-claim-hint">
          La palabra es obligatoria. No se activa automáticamente.
        </p>
        {error ? (
          <p id="pro-trial-claim-error" className="pro-trial-claim-error" role="alert">
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

      <ProTrialCongratulationsDialog
        open={dialogOpen}
        endsAt={endsAt}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
