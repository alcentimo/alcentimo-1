"use client";

import { useRouter } from "next/navigation";
import { Gift, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatProTrialEndsAt } from "@/lib/plans/trial";
import { clearProTrialCongrats } from "@/lib/plans/pro-trial-congrats-storage";

interface ProTrialCongratulationsDialogProps {
  open: boolean;
  endsAt: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de felicitaciones al activar Pro.
 * Se puede cerrar con Escape, clic fuera, X o el botón de acción.
 */
export function ProTrialCongratulationsDialog({
  open,
  endsAt,
  onOpenChange,
}: ProTrialCongratulationsDialogProps) {
  const router = useRouter();

  function dismiss() {
    clearProTrialCongrats();
    onOpenChange(false);
  }

  function handleStartSelling() {
    dismiss();
    router.push("/dashboard/catalogo");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="onboarding-welcome-dialog relative max-w-lg overflow-hidden p-0">
        <div className="onboarding-welcome-hero px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="onboarding-welcome-icon" aria-hidden="true">
                <Gift className="h-5 w-5" />
              </span>
              <div>
                <DialogHeader className="mb-0 space-y-1 text-left">
                  <DialogTitle className="text-lg text-zinc-900 dark:text-zinc-50">
                    ¡Felicidades! Desbloqueaste Plan Pro
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500">
                    30 días gratis del Plan Pro reclamados
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-800 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 pb-6">
          <div className="onboarding-welcome-message">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Prueba Pro activa
            </div>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              Completaste los requisitos y reclamaste tu mes gratis. Ya tienes 30
              días del Plan Pro con hasta 250 productos publicados
              {endsAt ? (
                <>
                  {" "}
                  hasta el <strong>{formatProTrialEndsAt(endsAt)}</strong>
                </>
              ) : null}
              .
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={dismiss}
            >
              ¡Genial!
            </Button>
            <Button
              type="button"
              className="btn-brand w-full sm:w-auto"
              onClick={handleStartSelling}
            >
              Empezar a vender
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
