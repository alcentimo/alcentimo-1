"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

/** Palabra que el admin debe escribir para habilitar la acción. */
export const ADMIN_CRITICAL_CONFIRM_WORD = "CONFIRMAR";

export interface AdminCriticalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Descripción del impacto (qué va a pasar). */
  impact: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

export function AdminCriticalConfirmDialog({
  open,
  onOpenChange,
  title,
  impact,
  confirmLabel = "Ejecutar acción",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
}: AdminCriticalConfirmDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const canConfirm =
    typed.trim().toUpperCase() === ADMIN_CRITICAL_CONFIRM_WORD && !loading;

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dismissible={!loading}>
      <DialogContent
        className="relative border-amber-200/80 dark:border-amber-900/50"
        onClose={loading ? undefined : () => onOpenChange(false)}
      >
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-zinc-600 dark:text-zinc-300">
            Acción irreversible o de alto impacto. Revisa el detalle antes de
            continuar.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "rounded-xl border px-3 py-3 text-sm",
            destructive
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
          )}
          role="status"
        >
          {impact}
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor={inputId}>
            Escribe{" "}
            <span className="font-mono font-semibold tracking-wide">
              {ADMIN_CRITICAL_CONFIRM_WORD}
            </span>{" "}
            para habilitar la acción
          </Label>
          <Input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={ADMIN_CRITICAL_CONFIRM_WORD}
            autoComplete="off"
            autoFocus
            disabled={loading}
            className="font-mono tracking-wide"
            onKeyDown={(event) => {
              if (event.key === "Enter" && canConfirm) {
                event.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            className={
              destructive
                ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50 dark:bg-red-600 dark:hover:bg-red-700"
                : undefined
            }
            onClick={onConfirm}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Procesando…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
