"use client";

import { MessageCircle } from "lucide-react";
import type { CatalogOrder } from "@/lib/orders/types";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { cn } from "@/lib/cn";

interface OrderWhatsAppButtonProps {
  order: CatalogOrder;
  compact?: boolean;
  className?: string;
  /** Abre el composer en el padre (cierra el detalle si hace falta). */
  onOpenRequest: () => void;
}

export function OrderWhatsAppButton({
  order,
  compact = false,
  className,
  onOpenRequest,
}: OrderWhatsAppButtonProps) {
  const hasPhone = Boolean(
    normalizeWhatsAppPhone(String(order.customer_phone ?? "")),
  );

  if (!hasPhone) {
    return compact ? (
      <span className="text-xs text-zinc-400">—</span>
    ) : (
      <span className="text-xs text-zinc-400">Sin teléfono</span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenRequest();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 font-medium text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
        compact
          ? "min-h-9 min-w-9 px-2 py-1 text-[11px]"
          : "min-h-9 px-2.5 py-1.5 text-xs",
        className,
      )}
      aria-label={`WhatsApp con ${order.customer_name}`}
      title="WhatsApp con mensaje generado por IA"
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {!compact && "WhatsApp"}
    </button>
  );
}
