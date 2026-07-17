"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { CatalogOrder } from "@/lib/orders/types";
import { renderOrderWhatsAppMessage } from "@/lib/orders/render-order-message";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";
import { OrderWhatsAppComposer } from "@/components/dashboard/orders/OrderWhatsAppComposer";
import { cn } from "@/lib/cn";

interface OrderWhatsAppButtonProps {
  order: CatalogOrder;
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
  compact?: boolean;
  className?: string;
}

export function OrderWhatsAppButton({
  order,
  storeName,
  messageTemplates,
  compact = false,
  className,
}: OrderWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);

  const hasPhone = Boolean(normalizeWhatsAppPhone(String(order.customer_phone ?? "")));

  const initialMessage = useMemo(
    () => renderOrderWhatsAppMessage(order, messageTemplates, storeName),
    [order, messageTemplates, storeName],
  );

  if (!hasPhone) {
    return compact ? (
      <span className="text-xs text-zinc-400">—</span>
    ) : (
      <span className="text-xs text-zinc-400">Sin teléfono</span>
    );
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
          "inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 font-medium text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
          compact
            ? "min-h-9 min-w-9 px-2 py-1 text-[11px]"
            : "min-h-9 px-2.5 py-1.5 text-xs",
          className,
        )}
        aria-label={`WhatsApp con ${order.customer_name}`}
      >
        <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {!compact && "WhatsApp"}
      </button>

      <OrderWhatsAppComposer
        open={open}
        customerName={order.customer_name}
        customerPhone={order.customer_phone}
        initialMessage={initialMessage}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
