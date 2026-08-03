"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { OrderEstado } from "@/lib/orders/order-status";
import {
  ORDER_MESSAGE_GOAL_OPTIONS,
  type OrderMessageGoalOption,
  type OrderWhatsAppMessageIntent,
} from "@/lib/ai/order-message-types";
import { useOrderAiWhatsAppMessage } from "@/components/dashboard/orders/useOrderAiWhatsAppMessage";
import { DashboardWhatsAppWidget } from "@/components/dashboard/whatsapp/DashboardWhatsAppWidget";
import { cn } from "@/lib/cn";

interface OrderWhatsAppComposerProps {
  open: boolean;
  customerName: string;
  customerPhone: string | null;
  fallbackMessage: string;
  orderId: string;
  storeName?: string;
  initialIntent?: OrderMessageGoalOption["value"];
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
  }, [open, initialIntent, fallbackMessage]);

  useEffect(() => {
    if (aiMessage) setMessage(aiMessage);
  }, [aiMessage]);

  const displayName = customerName.trim() || "cliente";

  const toolbar = (
    <div className="space-y-2">
      {lockedStatusUpdate ? (
        <p className="rounded-lg border border-emerald-200/80 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-emerald-900">
          Actualización de estado del pedido
          {storeName?.trim() ? ` · ${storeName.trim()}` : ""}. Puedes editar el
          mensaje antes de continuar.
        </p>
      ) : (
        <>
          <p className="text-[11px] font-medium text-zinc-600">
            Objetivo del mensaje
          </p>
          <div
            className="grid gap-1.5"
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
                    "rounded-lg border px-2.5 py-2 text-left transition-colors",
                    selected
                      ? "border-emerald-600 bg-white"
                      : "border-transparent bg-white/60 hover:border-zinc-200",
                  )}
                >
                  <p className="text-xs font-semibold text-zinc-900">
                    {option.label}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => void regenerate()}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 transition hover:text-emerald-950 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3 w-3" aria-hidden="true" />
        )}
        Regenerar con IA
      </button>
    </div>
  );

  return (
    <DashboardWhatsAppWidget
      open={open}
      onClose={onClose}
      contactName={displayName}
      phone={customerPhone}
      message={message}
      onMessageChange={setMessage}
      toolbar={toolbar}
      loading={loading}
      error={
        error
          ? `${error}. Se muestra un mensaje de respaldo que puedes editar.`
          : null
      }
      primaryLabel="Abrir chat"
      hint="El mensaje incluye datos del pedido. WhatsApp solo se abre al pulsar Abrir chat."
    />
  );
}
