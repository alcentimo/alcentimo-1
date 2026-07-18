"use client";

import { MessageCircle } from "lucide-react";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
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
  const displayName = customerName?.trim() || "cliente";
  const url = buildCustomerWhatsAppUrl(
    phone,
    undefined,
    `Hola ${displayName}, te escribo desde ${storeName}.`,
  );

  if (!url) {
    return <span className="text-xs text-zinc-400">Sin teléfono</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
        className,
      )}
      aria-label={`WhatsApp con ${displayName}`}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      WhatsApp
    </a>
  );
}
