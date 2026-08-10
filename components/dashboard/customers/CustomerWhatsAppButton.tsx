"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import type { StoreCustomerSummary } from "@/lib/customers/get-store-customers";
import {
  CUSTOMER_MESSAGE_GOAL_OPTIONS,
  type CustomerMessageGoal,
} from "@/lib/ai/customer-message-types";
import { suggestCustomerMessageGoal } from "@/lib/customers/customer-segments";
import {
  buildCustomerWhatsAppTemplate,
  getCustomerWhatsAppActionLabel,
} from "@/lib/customers/customer-whatsapp-templates";
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
  const suggestedGoal = useMemo(
    () => suggestCustomerMessageGoal(customer),
    [customer],
  );
  const defaultMessage = useMemo(
    () => buildCustomerWhatsAppTemplate(customer, storeName, suggestedGoal),
    [customer, storeName, suggestedGoal],
  );
  const actionLabel = useMemo(
    () => getCustomerWhatsAppActionLabel(customer),
    [customer],
  );
  const [message, setMessage] = useState(defaultMessage);

  const canOpen = Boolean(buildCustomerWhatsAppUrl(customer.phone));

  useEffect(() => {
    if (!open) return;
    setMessage(defaultMessage);
    setActiveGoal(suggestedGoal);
    setError(null);
    setLoading(false);
  }, [open, defaultMessage, suggestedGoal]);

  const applyTemplate = useCallback(
    (goal: CustomerMessageGoal) => {
      setActiveGoal(goal);
      setError(null);
      setMessage(buildCustomerWhatsAppTemplate(customer, storeName, goal));
    },
    [customer, storeName],
  );

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
        // Si la IA falla, conservar/aplicar plantilla estratégica.
        setMessage(buildCustomerWhatsAppTemplate(customer, storeName, goal));
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Error al generar el mensaje.",
        );
      } finally {
        setLoading(false);
      }
    },
    [customer, storeName],
  );

  if (!canOpen) {
    return <span className="customers-wa-missing">Sin teléfono</span>;
  }

  const toolbar = (
    <div className="dashboard-wa-ai-row">
      <span className="dashboard-wa-ai-label">
        <Sparkles className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
        Mensaje
      </span>
      <div
        className="dashboard-wa-ai-chips"
        role="tablist"
        aria-label="Plantillas de mensaje"
      >
        {CUSTOMER_MESSAGE_GOAL_OPTIONS.map((option) => {
          const selected = activeGoal === option.value;
          const suggested = suggestedGoal === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={loading}
              title={option.description}
              onClick={() => applyTemplate(option.value)}
              className={cn(
                "dashboard-wa-ai-chip",
                selected && "dashboard-wa-ai-chip-active",
                suggested && !selected && "dashboard-wa-ai-chip-suggested",
              )}
            >
              {loading && selected ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={loading || !activeGoal}
        onClick={() => {
          if (activeGoal) void generateWithAi(activeGoal);
        }}
        className="dashboard-wa-ai-chip dashboard-wa-ai-chip-suggested"
        title="Mejorar el mensaje con IA"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3 w-3" aria-hidden="true" />
        )}
        IA
      </button>
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
        className={cn("customers-wa-btn", className)}
        aria-label={`WhatsApp con ${displayName}`}
        aria-expanded={open}
      >
        <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{actionLabel}</span>
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
        hint="Plantilla lista para reenganche o VIP. Puedes editarla o pulsar IA para refinarla antes de abrir WhatsApp."
      />
    </>
  );
}
