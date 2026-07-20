"use client";

import { isProTrialClaimCodeValid } from "@/lib/plans/trial-unlock";

interface ProTrialClaimFieldsProps {
  claimCode: string;
  onClaimCodeChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
  unlockReady: boolean;
  submitLabel?: string;
  /** Permite enviar sin cumplir el conteo mínimo de productos (solo visualización). */
  allowClaimWithoutUnlock?: boolean;
}

export function ProTrialClaimFields({
  claimCode,
  onClaimCodeChange,
  onSubmit,
  pending,
  error,
  unlockReady,
  submitLabel = "Activar prueba Pro",
  allowClaimWithoutUnlock = false,
}: ProTrialClaimFieldsProps) {
  const codeValid = isProTrialClaimCodeValid(claimCode);
  const canSubmit = (unlockReady || allowClaimWithoutUnlock) && codeValid && !pending;

  return (
    <div className="pro-trial-claim">
      <label htmlFor="pro-trial-claim-code" className="pro-trial-claim-label">
        Escribe <span className="font-semibold">ALCENTIMO</span> para reclamar tu premio
      </label>
      <input
        id="pro-trial-claim-code"
        type="text"
        value={claimCode}
        onChange={(event) => onClaimCodeChange(event.target.value)}
        placeholder="ALCENTIMO"
        autoComplete="off"
        spellCheck={false}
        className="pro-trial-claim-input"
        aria-invalid={claimCode.length > 0 && !codeValid}
      />
      {claimCode.length > 0 && !codeValid ? (
        <p className="pro-trial-claim-hint">La palabra debe ser exactamente ALCENTIMO.</p>
      ) : null}
      {error ? (
        <p className="pro-trial-claim-error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="text-sm text-teal-700 dark:text-teal-300" role="status">
          Activando tu prueba Pro…
        </p>
      ) : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="pro-trial-banner-cta"
      >
        {pending ? "Activando…" : submitLabel}
      </button>
    </div>
  );
}
