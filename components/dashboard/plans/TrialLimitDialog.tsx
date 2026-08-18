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
import { getProTrialLimitLabel } from "@/lib/plans/trial";

interface TrialLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialEligible: boolean;
  /** Límite del Plan Profesional en prueba (p. ej. 150). */
  proProductLimit?: number | null;
  /** Abre el modal de reclamación ALCENTIMO. */
  onOpenClaimModal?: () => void;
}

export function TrialLimitDialog({
  open,
  onOpenChange,
  trialEligible,
  proProductLimit,
  onOpenClaimModal,
}: TrialLimitDialogProps) {
  const router = useRouter();
  const proLimitLabel = getProTrialLimitLabel(proProductLimit);

  function handleClose(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Límite de productos alcanzado</DialogTitle>
          <DialogDescription>
            {trialEligible ? (
              <>
                Has alcanzado tu límite de productos en el plan Gratis. Reclama
                30 días gratis del Plan Profesional ({proLimitLabel}) o elige un
                plan de pago para seguir creciendo.
              </>
            ) : (
              <>
                Has alcanzado tu límite de productos en el plan Gratis. Elige un
                plan de pago para seguir creciendo.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row">
          {trialEligible && onOpenClaimModal ? (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                handleClose(false);
                onOpenClaimModal();
              }}
            >
              Reclamar mes gratis
            </button>
          ) : null}
          <Link
            href="/activar"
            className={
              trialEligible && onOpenClaimModal
                ? "btn-secondary w-full text-center"
                : "btn-primary w-full text-center"
            }
          >
            Ver planes
          </Link>
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
