"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { markWelcomeSeen } from "@/lib/onboarding/client-storage";

interface AiWelcomeDialogProps {
  open: boolean;
  storeId: string;
  storeName: string;
  rubroLabel: string;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

export function AiWelcomeDialog({
  open,
  storeId,
  storeName,
  rubroLabel,
  onOpenChange,
  onContinue,
}: AiWelcomeDialogProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessage(null);

    void fetch("/api/dashboard/onboarding/welcome", {
      method: "POST",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          message?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo cargar el saludo.");
        }
        if (!cancelled) {
          setMessage(payload.message ?? null);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudo cargar el saludo.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleClose() {
    markWelcomeSeen(storeId);
    onOpenChange(false);
  }

  function handleContinue() {
    markWelcomeSeen(storeId);
    onOpenChange(false);
    onContinue();
  }

  const fallbackMessage = `¡Hola! Bienvenido/a a Alcentimo, ${storeName}. Tu tienda de ${rubroLabel} ya está lista para publicar productos, configurar pagos y compartir tu catálogo.`;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent
        className="onboarding-welcome-dialog max-w-lg overflow-hidden p-0"
        onClose={handleClose}
      >
        <div className="onboarding-welcome-hero px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="onboarding-welcome-icon" aria-hidden="true">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-lg text-zinc-900 dark:text-zinc-50">
                    Bienvenido/a, {storeName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500">
                    Rubro: {rubroLabel}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-800 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200"
              aria-label="Cerrar bienvenida"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 pb-6">
          <div className="onboarding-welcome-message">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              Asistente Alcentimo
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Preparando tu bienvenida personalizada…
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {message ?? fallbackMessage}
              </p>
            )}
            {error ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{error}</p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Explorar por mi cuenta
            </Button>
            <Button type="button" className="btn-brand" onClick={handleContinue}>
              Ver mis primeros pasos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
