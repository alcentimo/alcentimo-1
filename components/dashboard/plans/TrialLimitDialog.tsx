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

  async function handleStartTrial() {
    setError(null);
    setPending(true);

    const result = await startProTrial();

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccessEndsAt(result.endsAt);
    router.refresh();
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
      setSuccessEndsAt(null);
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
            ) : (
              <>
                Has alcanzado tu límite de 10 productos en el plan Gratis.
                {trialEligible
                  ? " Activa una prueba gratuita de un mes del plan Pro (250 productos)."
                  : " Elige un plan de pago para seguir creciendo."}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {successEndsAt ? (
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="btn-primary w-full"
            >
              Continuar
            </button>
          ) : trialEligible ? (
            <>
              <button
                type="button"
                onClick={() => void handleStartTrial()}
                disabled={pending}
                className="btn-primary w-full"
              >
                {pending ? "Activando…" : "Activar prueba Pro gratis"}
              </button>
              <Link href="/activar" className="btn-secondary w-full text-center">
                Ver planes
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
