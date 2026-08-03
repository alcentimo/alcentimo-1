"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import type { CatalogOrder } from "@/lib/orders/types";
import type { OrderEstado } from "@/lib/orders/order-status";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { renderOrderWhatsAppMessage } from "@/lib/orders/render-order-message";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";
import { OrderWhatsAppComposer } from "@/components/dashboard/orders/OrderWhatsAppComposer";
import { cn } from "@/lib/cn";

interface OrderStatusWhatsAppPromptProps {
  order: CatalogOrder;
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
  newEstado: OrderEstado;
  onDismiss: () => void;
  className?: string;
  compact?: boolean;
}

export function OrderStatusWhatsAppPrompt({
  order,
  storeName,
  messageTemplates,
  newEstado,
  onDismiss,
  className,
  compact = false,
}: OrderStatusWhatsAppPromptProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  const hasPhone = Boolean(
    normalizeWhatsAppPhone(String(order.customer_phone ?? "")),
  );

  const fallbackMessage = useMemo(
    () => renderOrderWhatsAppMessage(order, messageTemplates, storeName),
    [order, messageTemplates, storeName],
  );

  function handlePreviewClick(event: MouseEvent) {
    event.stopPropagation();
    if (!hasPhone) return;
    setComposerOpen(true);
  }

  function handleDismiss(event: MouseEvent) {
    event.stopPropagation();
    onDismiss();
  }

  return (
    <>
      <div
        className={cn(
          "orders-status-wa-prompt",
          compact && "orders-status-wa-prompt-compact",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handlePreviewClick}
          disabled={!hasPhone}
          className="orders-status-wa-prompt-action"
          aria-label={
            hasPhone
              ? "Preparar mensaje de WhatsApp"
              : "Sin teléfono para WhatsApp"
          }
        >
          {hasPhone ? (
            <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            {hasPhone
              ? "Preparar mensaje de WhatsApp"
              : "Sin teléfono para WhatsApp"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="orders-status-wa-prompt-dismiss"
          aria-label="Descartar sugerencia de WhatsApp"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {!hasPhone ? (
        <p className="orders-status-wa-prompt-hint">
          Agrega un teléfono al pedido para avisar al cliente.
        </p>
      ) : null}

      <OrderWhatsAppComposer
        open={composerOpen}
        customerName={order.customer_name}
        customerPhone={order.customer_phone}
        fallbackMessage={fallbackMessage}
        orderId={order.id}
        storeName={storeName}
        newEstado={newEstado}
        onClose={() => {
          setComposerOpen(false);
          onDismiss();
        }}
      />
    </>
  );
}
