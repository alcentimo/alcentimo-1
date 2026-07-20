"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startProTrial } from "@/lib/plans/trial-actions";
import { formatProTrialEndsAt } from "@/lib/plans/trial";
import { ProTrialClaimFields } from "@/components/dashboard/plans/ProTrialClaimFields";

interface TrialLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialEligible: boolean;
}

export function TrialLimitDialog({
  open,
  onOpenChange,
  trialEligible,
}: TrialLimitDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEndsAt, setSuccessEndsAt] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState("");

  async function handleStartTrial() {
    setError(null);
    setPending(true);

    try {
      const result = await startProTrial(claimCode);

      if (!result.ok) {
        console.error("[startProTrial]", result.error);
        setError(result.error);
        return;
      }

      setSuccessEndsAt(result.endsAt);
      setClaimCode("");
      router.refresh();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Error inesperado al activar la prueba Pro.";
      console.error("[startProTrial]", cause);
      setError(message);
    } finally {
      setPending(false);
    }
  }

  function handleContinueAfterSuccess() {
    handleClose(false);
    router.push("/dashboard/catalogo?trial=activated");
    router.refresh();
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
      setSuccessEndsAt(null);
      setClaimCode("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {successEndsAt ? "Prueba Pro activada" : "Límite de productos alcanzado"}
          </DialogTitle>
          <DialogDescription>
            {successEndsAt ? (
              <>
                Ya puedes publicar hasta 250 productos. Tu prueba termina el{" "}
                {formatProTrialEndsAt(successEndsAt)}.
              </>
            ) : trialEligible ? (
              <>
                ¡Felicidades! Has desbloqueado una prueba Pro de 1 mes. Escribe
                ALCENTIMO para reclamar tu premio.
              </>
            ) : (
              <>
                Has alcanzado tu límite de 10 productos en el plan Gratis. Elige
                un plan de pago para seguir creciendo.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {successEndsAt ? (
          <button
            type="button"
            onClick={handleContinueAfterSuccess}
            className="btn-primary w-full"
          >
            Ir al catálogo
          </button>
        ) : trialEligible ? (
          <ProTrialClaimFields
            claimCode={claimCode}
            onClaimCodeChange={setClaimCode}
            onSubmit={() => void handleStartTrial()}
            pending={pending}
            error={error}
            unlockReady
            submitLabel="Activar prueba Pro gratis"
          />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/activar" className="btn-primary w-full text-center">
              Ver planes
            </Link>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="btn-secondary w-full"
            >
              Cerrar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
