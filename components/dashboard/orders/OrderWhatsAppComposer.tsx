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
  const [goal, setGoal] = useState<OrderMessageGoalOption["value"] | null>(
    lockedStatusUpdate ? null : initialIntent,
  );
  const [message, setMessage] = useState(fallbackMessage);
  const [aiRequested, setAiRequested] = useState(lockedStatusUpdate);

  const intent: OrderWhatsAppMessageIntent = lockedStatusUpdate
    ? "status_update"
    : (goal ?? initialIntent);

  const { message: aiMessage, loading, error, regenerate } =
    useOrderAiWhatsAppMessage({
      orderId,
      newEstado,
      intent,
      enabled: open && aiRequested,
    });

  useEffect(() => {
    if (!open) return;
    setGoal(lockedStatusUpdate ? null : initialIntent);
    setMessage(fallbackMessage);
    setAiRequested(lockedStatusUpdate);
  }, [open, initialIntent, fallbackMessage, lockedStatusUpdate]);

  useEffect(() => {
    if (aiMessage) setMessage(aiMessage);
  }, [aiMessage]);

  const displayName = customerName.trim() || "cliente";

  function handleSelectGoal(nextGoal: OrderMessageGoalOption["value"]) {
    setGoal(nextGoal);
    setAiRequested(true);
  }

  const toolbar = (
    <div className="space-y-2">
      {lockedStatusUpdate ? (
        <p className="rounded-lg border border-emerald-200/80 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-emerald-900">
          Actualización de estado del pedido
          {storeName?.trim() ? ` · ${storeName.trim()}` : ""}. Edita el mensaje
          antes de continuar.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
            Generar con IA
          </div>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Objetivos de mensaje con IA"
          >
            {ORDER_MESSAGE_GOAL_OPTIONS.map((option) => {
              const selected = goal === option.value && aiRequested;
              const suggested = option.value === initialIntent;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={loading}
                  title={option.description}
                  onClick={() => handleSelectGoal(option.value)}
                  className={cn(
                    "dashboard-wa-ai-chip",
                    selected && "dashboard-wa-ai-chip-active",
                    suggested && !selected && "dashboard-wa-ai-chip-suggested",
                  )}
                >
                  {loading && selected ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                  )}
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {aiRequested ? (
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
          Regenerar
        </button>
      ) : null}
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
      primaryLabel="Continuar"
      hint="Elige un objetivo con IA o edita el mensaje. WhatsApp solo se abre al pulsar Continuar."
    />
  );
}
