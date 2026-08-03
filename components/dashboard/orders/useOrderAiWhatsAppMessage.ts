"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderEstado } from "@/lib/orders/order-status";
import type { OrderWhatsAppMessageIntent } from "@/lib/ai/order-message-types";

interface UseOrderAiWhatsAppMessageOptions {
  orderId: string;
  newEstado?: OrderEstado;
  intent?: OrderWhatsAppMessageIntent;
  enabled?: boolean;
}

interface UseOrderAiWhatsAppMessageResult {
  message: string | null;
  loading: boolean;
  error: string | null;
  regenerate: () => Promise<void>;
}

export function useOrderAiWhatsAppMessage({
  orderId,
  newEstado,
  intent,
  enabled = true,
}: UseOrderAiWhatsAppMessageOptions): UseOrderAiWhatsAppMessageResult {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!enabled || !orderId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/orders/generate-message", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          newEstado,
          intent: intent ?? (newEstado ? "status_update" : "order_confirmation"),
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
      setMessage(null);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Error al generar el mensaje.",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, intent, newEstado, orderId]);

  useEffect(() => {
    if (!enabled) {
      setMessage(null);
      setError(null);
      setLoading(false);
      return;
    }

    void generate();
  }, [enabled, generate]);

  return {
    message,
    loading,
    error,
    regenerate: generate,
  };
}
