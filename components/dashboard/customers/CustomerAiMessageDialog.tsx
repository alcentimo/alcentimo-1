"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import type { StoreCustomerSummary } from "@/lib/customers/get-store-customers";
import {
  CUSTOMER_MESSAGE_GOAL_OPTIONS,
  type CustomerMessageGoal,
} from "@/lib/ai/customer-message-types";
import { suggestCustomerMessageGoal } from "@/lib/customers/customer-segments";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface CustomerAiMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: StoreCustomerSummary;
  storeName: string;
}

export function CustomerAiMessageDialog({
  open,
  onOpenChange,
  customer,
  storeName,
}: CustomerAiMessageDialogProps) {
  const [goal, setGoal] = useState<CustomerMessageGoal>(() =>
    suggestCustomerMessageGoal(customer),
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const displayName = customer.displayName?.trim() || "cliente";
  const whatsAppUrl = buildCustomerWhatsAppUrl(customer.phone, undefined, message);

  const generateMessage = useCallback(async () => {
    setError(null);
    setLoading(true);
    setCopied(false);

    try {
      const response = await fetch("/api/dashboard/customers/generate-message", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerUserId: customer.userId,
          goal,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo generar el mensaje.");
      }

      if (!payload.message?.trim()) {
        throw new Error("La IA no devolvió un mensaje válido.");
      }

      setMessage(payload.message.trim());
    } catch (generateError) {
      setMessage("");
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Error al generar el mensaje.",
      );
    } finally {
      setLoading(false);
    }
  }, [customer.userId, goal]);

  useEffect(() => {
    if (!open) return;

    setGoal(suggestCustomerMessageGoal(customer));
    setMessage("");
    setError(null);
    setCopied(false);
  }, [open, customer]);

  useEffect(() => {
    if (!open) return;
    void generateMessage();
  }, [open, goal, generateMessage]);

  async function handleCopy() {
    if (!message.trim()) return;

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar el mensaje.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} containerClassName="max-w-xl">
      <DialogContent className="relative" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Mensaje con IA para WhatsApp
          </DialogTitle>
          <DialogDescription>
            Mensaje personalizado para {displayName} desde {storeName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Objetivo del mensaje
            </p>
            <div
              className="mt-2 grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Objetivo del mensaje"
            >
              {CUSTOMER_MESSAGE_GOAL_OPTIONS.map((option) => {
                const selected = goal === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={loading}
                    onClick={() => setGoal(option.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-emerald-600 bg-emerald-50/80 dark:border-emerald-500 dark:bg-emerald-950/30"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
                    )}
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {option.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Mensaje generado
              </p>
              <button
                type="button"
                onClick={() => void generateMessage()}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 transition hover:text-emerald-800 disabled:opacity-50 dark:text-emerald-400"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                )}
                Regenerar
              </button>
            </div>

            <div className="relative">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={7}
                disabled={loading}
                placeholder={
                  loading ? "Generando mensaje personalizado…" : "El mensaje aparecerá aquí."
                }
                className="customers-notes-input min-h-[160px] pr-3"
              />
              {loading ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 dark:bg-zinc-950/60">
                  <Loader2
                    className="h-5 w-5 animate-spin text-emerald-600"
                    aria-hidden="true"
                  />
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={!message.trim() || loading}
            onClick={() => void handleCopy()}
            className="gap-1.5"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copiado" : "Copiar mensaje"}
          </Button>

          {whatsAppUrl ? (
            <button
              type="button"
              disabled={!message.trim() || loading}
              onClick={() => {
                window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
                onOpenChange(false);
              }}
              className={cn(
                "btn-primary inline-flex items-center justify-center gap-1.5",
                (!message.trim() || loading) && "opacity-50",
              )}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Abrir chat
            </button>
          ) : (
            <span className="text-xs text-zinc-500">
              Este cliente no tiene teléfono registrado.
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
