"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";

interface OrderWhatsAppComposerProps {
  open: boolean;
  customerName: string;
  customerPhone: string | null;
  initialMessage: string;
  onClose: () => void;
}

export function OrderWhatsAppComposer({
  open,
  customerName,
  customerPhone,
  initialMessage,
  onClose,
}: OrderWhatsAppComposerProps) {
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    if (open) setMessage(initialMessage);
  }, [open, initialMessage]);

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
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              WhatsApp
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
          <label htmlFor="wa-composer-message" className="orders-slideover-label">
            Edita el mensaje antes de enviar
          </label>
          <textarea
            id="wa-composer-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={10}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm leading-relaxed text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <footer className="orders-wa-composer-footer">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="btn-brand inline-flex min-h-11 w-full items-center justify-center gap-2"
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
