"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import type { OrderEstado } from "@/lib/orders/order-status";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { useOrderAiWhatsAppMessage } from "@/components/dashboard/orders/useOrderAiWhatsAppMessage";
import { cn } from "@/lib/cn";

interface OrderWhatsAppComposerProps {
  open: boolean;
  customerName: string;
  customerPhone: string | null;
  fallbackMessage: string;
  orderId: string;
  newEstado?: OrderEstado;
  onClose: () => void;
}

export function OrderWhatsAppComposer({
  open,
  customerName,
  customerPhone,
  fallbackMessage,
  orderId,
  newEstado,
  onClose,
}: OrderWhatsAppComposerProps) {
  const [message, setMessage] = useState(fallbackMessage);

  const { message: aiMessage, loading, error, regenerate } = useOrderAiWhatsAppMessage({
    orderId,
    newEstado,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setMessage(fallbackMessage);
  }, [open, fallbackMessage]);

  useEffect(() => {
    if (aiMessage) setMessage(aiMessage);
  }, [aiMessage]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const whatsappUrl = buildCustomerWhatsAppUrl(customerPhone, undefined, message);

  return (
    <div className="orders-wa-composer-root" role="presentation">
      <button
        type="button"
        className="orders-slideover-backdrop"
        aria-label="Cerrar compositor de WhatsApp"
        onClick={onClose}
      />

      <div
        className="orders-wa-composer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-composer-title"
      >
        <header className="orders-wa-composer-header">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
              WhatsApp con IA
            </p>
            <h2
              id="wa-composer-title"
              className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Mensaje para {customerName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="orders-wa-composer-body">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="wa-composer-message" className="orders-slideover-label">
              Mensaje generado — puedes editarlo antes de enviar
            </label>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={loading}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 transition hover:text-violet-800 disabled:opacity-50 dark:text-violet-400"
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
              id="wa-composer-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={10}
              disabled={loading && !message}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm leading-relaxed text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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

          {error ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400" role="alert">
              {error}. Se muestra un mensaje de respaldo que puedes editar.
            </p>
          ) : null}
        </div>

        <footer className="orders-wa-composer-footer">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={cn(
                "btn-brand inline-flex min-h-11 w-full items-center justify-center gap-2",
                loading && !message && "pointer-events-none opacity-50",
              )}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Enviar por WhatsApp
            </a>
          ) : (
            <p className="text-center text-sm text-red-600 dark:text-red-400">
              No hay un teléfono válido para WhatsApp.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
