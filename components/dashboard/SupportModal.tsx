"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  submitSupportMessage,
  type SupportFormState,
} from "@/lib/support/actions";

const initialState: SupportFormState = {};

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportModal({
  open,
  onOpenChange,
}: SupportModalProps) {
  const [state, formAction, pending] = useActionState(
    submitSupportMessage,
    initialState,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setMessage("");
    }
  }, [open]);

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={handleClose} className="relative max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cómo podemos ayudarte?</DialogTitle>
          <DialogDescription>
            Cuéntanos un problema o comparte una sugerencia. Lo revisaremos pronto.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <div className="space-y-4">
            <p
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              role="status"
            >
              ¡Gracias! Recibimos tu mensaje.
            </p>
            <DialogFooter className="mt-0">
              <Button type="button" onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Tu mensaje
              </span>
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe el problema o tu idea de mejora…"
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-800"
                disabled={pending}
              />
            </label>

            {state.error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {state.error}
              </p>
            ) : null}

            <DialogFooter className="mt-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || message.trim().length < 10}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Enviando…
                  </>
                ) : (
                  "Enviar"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
