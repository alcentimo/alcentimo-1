"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { DashboardWhatsAppWidget } from "@/components/dashboard/whatsapp/DashboardWhatsAppWidget";
import { cn } from "@/lib/cn";

interface CustomerWhatsAppButtonProps {
  customerName: string | null;
  phone: string | null;
  storeName: string;
  className?: string;
}

export function CustomerWhatsAppButton({
  customerName,
  phone,
  storeName,
  className,
}: CustomerWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const displayName = customerName?.trim() || "cliente";
  const defaultMessage = useMemo(
    () => `Hola ${displayName}, te escribo desde ${storeName}.`,
    [displayName, storeName],
  );
  const [message, setMessage] = useState(defaultMessage);

  const canOpen = Boolean(buildCustomerWhatsAppUrl(phone));

  useEffect(() => {
    if (!open) return;
    setMessage(defaultMessage);
  }, [open, defaultMessage]);

  if (!canOpen) {
    return <span className="text-xs text-zinc-400">Sin teléfono</span>;
  }

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
        phone={phone}
        message={message}
        onMessageChange={setMessage}
        primaryLabel="Continuar"
        hint="Edita el mensaje si quieres. WhatsApp se abrirá solo al pulsar Continuar."
      />
    </>
  );
}
