"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import type { OrderEstado } from "@/lib/orders/order-status";
import {
  ORDER_MESSAGE_GOAL_OPTIONS,
  type OrderMessageGoalOption,
  type OrderWhatsAppMessageIntent,
} from "@/lib/ai/order-message-types";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { useOrderAiWhatsAppMessage } from "@/components/dashboard/orders/useOrderAiWhatsAppMessage";
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

interface OrderWhatsAppComposerProps {
  open: boolean;
  customerName: string;
  customerPhone: string | null;
  fallbackMessage: string;
  orderId: string;
  storeName?: string;
  /** Objetivo inicial sugerido (confirmación / envío / pago). */
  initialIntent?: OrderMessageGoalOption["value"];
  /** Si viene de un cambio de estado, fija el modo status_update. */
  newEstado?: OrderEstado;
  onClose: () => void;
}

export function OrderWhatsAppComposer({
  open,
  customerName,
  customerPhone,
  fallbackMessage,
  orderId,
  storeName,
  initialIntent = "order_confirmation",
  newEstado,
  onClose,
}: OrderWhatsAppComposerProps) {
  const lockedStatusUpdate = Boolean(newEstado);
  const [goal, setGoal] = useState<OrderMessageGoalOption["value"]>(initialIntent);
  const [message, setMessage] = useState(fallbackMessage);
  const [copied, setCopied] = useState(false);

  const intent: OrderWhatsAppMessageIntent = lockedStatusUpdate
    ? "status_update"
    : goal;

  const { message: aiMessage, loading, error, regenerate } =
    useOrderAiWhatsAppMessage({
      orderId,
      newEstado,
      intent,
      enabled: open,
    });

  useEffect(() => {
    if (!open) return;
    setGoal(initialIntent);
    setMessage(fallbackMessage);
    setCopied(false);
  }, [open, initialIntent, fallbackMessage]);

  useEffect(() => {
    if (aiMessage) setMessage(aiMessage);
  }, [aiMessage]);

  const handleCopy = useCallback(async () => {
    if (!message.trim()) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // El error de generación ya cubre fallos de red; copiar es secundario.
    }
  }, [message]);

  const whatsappUrl = buildCustomerWhatsAppUrl(customerPhone, undefined, message);
  const displayName = customerName.trim() || "cliente";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      containerClassName="max-w-xl"
    >
      <DialogContent className="relative" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Mensaje con IA para WhatsApp
          </DialogTitle>
          <DialogDescription>
            Mensaje de ventas para {displayName}
            {storeName?.trim() ? ` desde ${storeName.trim()}` : ""}. Incluye
            productos y total del pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {lockedStatusUpdate ? (
            <p className="rounded-xl border border-violet-200/80 bg-violet-50/70 px-3 py-2 text-xs text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
              Mensaje de actualización de estado. Puedes editarlo antes de
              enviarlo.
            </p>
          ) : (
            <div>
              <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Objetivo del mensaje
              </p>
              <div
                className="mt-2 grid gap-2 sm:grid-cols-1"
                role="radiogroup"
                aria-label="Objetivo del mensaje"
              >
                {ORDER_MESSAGE_GOAL_OPTIONS.map((option) => {
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
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Mensaje generado
              </p>
              <button
                type="button"
                onClick={() => void regenerate()}
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
                rows={8}
                disabled={loading}
                placeholder={
                  loading
                    ? "Generando mensaje con datos del pedido…"
                    : "El mensaje aparecerá aquí."
                }
                className="min-h-[170px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm leading-relaxed text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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
            <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
              {error}. Se muestra un mensaje de respaldo que puedes editar.
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

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={cn(
                "btn-primary inline-flex items-center justify-center gap-1.5",
                (!message.trim() || loading) && "pointer-events-none opacity-50",
              )}
              aria-disabled={!message.trim() || loading}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Enviar por WhatsApp
            </a>
          ) : (
            <span className="text-xs text-zinc-500">
              Este pedido no tiene teléfono válido para WhatsApp.
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
