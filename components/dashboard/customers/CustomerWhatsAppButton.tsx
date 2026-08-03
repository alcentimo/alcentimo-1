"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import type { StoreCustomerSummary } from "@/lib/customers/get-store-customers";
import {
  CUSTOMER_MESSAGE_GOAL_OPTIONS,
  type CustomerMessageGoal,
} from "@/lib/ai/customer-message-types";
import { suggestCustomerMessageGoal } from "@/lib/customers/customer-segments";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { DashboardWhatsAppWidget } from "@/components/dashboard/whatsapp/DashboardWhatsAppWidget";
import { cn } from "@/lib/cn";

interface CustomerWhatsAppButtonProps {
  customer: StoreCustomerSummary;
  storeName: string;
  className?: string;
}

export function CustomerWhatsAppButton({
  customer,
  storeName,
  className,
}: CustomerWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<CustomerMessageGoal | null>(null);

  const displayName = customer.displayName?.trim() || "cliente";
  const defaultMessage = useMemo(
    () => `Hola ${displayName}, te escribo desde ${storeName}.`,
    [displayName, storeName],
  );
  const [message, setMessage] = useState(defaultMessage);
  const suggestedGoal = useMemo(
    () => suggestCustomerMessageGoal(customer),
    [customer],
  );

  const canOpen = Boolean(buildCustomerWhatsAppUrl(customer.phone));

  useEffect(() => {
    if (!open) return;
    setMessage(defaultMessage);
    setActiveGoal(null);
    setError(null);
    setLoading(false);
  }, [open, defaultMessage]);

  const generateWithAi = useCallback(
    async (goal: CustomerMessageGoal) => {
      setActiveGoal(goal);
      setError(null);
      setLoading(true);

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
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Error al generar el mensaje.",
        );
      } finally {
        setLoading(false);
      }
    },
    [customer.userId],
  );

  if (!canOpen) {
    return <span className="text-xs text-zinc-400">Sin teléfono</span>;
  }

  const toolbar = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
        <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Generar con IA
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Objetivos de mensaje con IA"
      >
        {CUSTOMER_MESSAGE_GOAL_OPTIONS.map((option) => {
          const selected = activeGoal === option.value;
          const suggested = suggestedGoal === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={loading}
              title={option.description}
              onClick={() => void generateWithAi(option.value)}
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
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
          className,
        )}
        aria-label={`WhatsApp con ${displayName}`}
        aria-expanded={open}
      >
        <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        WhatsApp
      </button>

      <DashboardWhatsAppWidget
        open={open}
        onClose={() => setOpen(false)}
        contactName={displayName}
        phone={customer.phone}
        message={message}
        onMessageChange={setMessage}
        toolbar={toolbar}
        loading={loading}
        error={error}
        primaryLabel="Continuar"
        hint="Usa IA para reactivación o agradecimiento, edita si quieres y pulsa Continuar para abrir WhatsApp."
      />
    </>
  );
}
