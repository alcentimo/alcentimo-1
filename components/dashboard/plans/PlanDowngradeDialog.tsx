"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  cancelScheduledPlanDowngrade,
  schedulePlanDowngrade,
} from "@/lib/plans/plan-change-actions";
import { formatProTrialEndsAt } from "@/lib/plans/trial";
import type { BillingPeriod } from "@/src/config/plan-pricing-ui";
import type { PlanId } from "@/src/config/plans";

interface PlanDowngradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlanId: PlanId;
  targetPlanName: string;
  currentPlanName: string;
  effectiveAt: string | null;
  billingPeriod: BillingPeriod;
}

export function PlanDowngradeDialog({
  open,
  onOpenChange,
  targetPlanId,
  targetPlanName,
  currentPlanName,
  effectiveAt,
  billingPeriod,
}: PlanDowngradeDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const effectiveLabel = effectiveAt ? formatProTrialEndsAt(effectiveAt) : null;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await schedulePlanDowngrade({
        targetPlanId,
        billingPeriod,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  function handleClose() {
    onOpenChange(false);
    setError(null);
    setSuccess(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}
      containerClassName="max-w-md"
    >
      <DialogContent className="p-6" onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>
            {success ? "Cambio programado" : `Bajar a ${targetPlanName}`}
          </DialogTitle>
          <DialogDescription>
            {success
              ? `Seguirás con ${currentPlanName} hasta el corte. Luego pasaremos a ${targetPlanName} automáticamente.`
              : `Tu plan ${currentPlanName} y sus límites se mantienen hasta la fecha de corte. El cambio a ${targetPlanName} no se aplica de inmediato.`}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="mt-4 space-y-4">
            {effectiveLabel ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Fecha de cambio:{" "}
                <span className="font-medium text-neutral-900 dark:text-neutral-50">
                  {effectiveLabel}
                </span>
              </p>
            ) : null}
            <Button type="button" className="w-full" onClick={handleClose}>
              Entendido
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
              <li>No hay cobro ni reembolso por bajar de plan.</li>
              <li>
                Conservas los beneficios actuales hasta{" "}
                {effectiveLabel ?? "tu próximo corte"}.
              </li>
              <li>
                Ese día, los límites pasan a {targetPlanName} de forma automática.
              </li>
            </ul>

            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Programando…
                  </>
                ) : (
                  "Programar cambio"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PendingDowngradeBannerProps {
  pendingPlanName: string;
  effectiveAt: string;
}

export function PendingDowngradeBanner({
  pendingPlanName,
  effectiveAt,
}: PendingDowngradeBannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const effectiveLabel = formatProTrialEndsAt(effectiveAt);

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelScheduledPlanDowngrade();
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/25">
      <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
        Cambio a {pendingPlanName} programado
      </p>
      <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
        Sigues con tu plan actual hasta el {effectiveLabel}. Ese día aplicaremos
        automáticamente {pendingPlanName} y sus límites.
      </p>
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        className="mt-3 text-sm font-medium text-amber-950 underline underline-offset-2 hover:no-underline disabled:opacity-60 dark:text-amber-100"
      >
        {pending ? "Cancelando…" : "Cancelar cambio programado"}
      </button>
    </div>
  );
}
