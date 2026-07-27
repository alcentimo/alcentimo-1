"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatProTrialSetupRemainingMessage } from "@/lib/plans/trial-unlock";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";

interface TrialLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialEligible: boolean;
  setupStatus?: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">;
}

export function TrialLimitDialog({
  open,
  onOpenChange,
  trialEligible,
  setupStatus,
}: TrialLimitDialogProps) {
  const router = useRouter();

  function handleClose(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  const setupIncomplete =
    trialEligible &&
    setupStatus &&
    (!setupStatus.hasProducts || !setupStatus.hasPaymentsConfigured);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Límite de productos alcanzado</DialogTitle>
          <DialogDescription>
            {setupIncomplete ? (
              <>
                {formatProTrialSetupRemainingMessage(setupStatus)} Después podrás
                publicar hasta 250 productos con la prueba Pro.
              </>
            ) : trialEligible ? (
              <>
                Completa la configuración inicial para activar automáticamente tus
                30 días gratis del Plan Pro (250 productos).
              </>
            ) : (
              <>
                Has alcanzado tu límite de 10 productos en el plan Gratis. Elige
                un plan de pago para seguir creciendo.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row">
          {setupIncomplete ? (
            <>
              {!setupStatus.hasProducts ? (
                <Link
                  href="/dashboard/catalogo?nuevo=1"
                  className="btn-primary w-full text-center"
                  onClick={() => handleClose(false)}
                >
                  Añadir productos
                </Link>
              ) : null}
              {!setupStatus.hasPaymentsConfigured ? (
                <Link
                  href="/dashboard/ajustes?tab=payments"
                  className="btn-primary w-full text-center"
                  onClick={() => handleClose(false)}
                >
                  Configurar pagos
                </Link>
              ) : null}
            </>
          ) : (
            <Link href="/activar" className="btn-primary w-full text-center">
              Ver planes
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              handleClose(false);
              router.refresh();
            }}
            className="btn-secondary w-full"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
