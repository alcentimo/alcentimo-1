"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { MessageCircle, X } from "lucide-react";
import type { CatalogOrder } from "@/lib/orders/types";
import type { OrderEstado } from "@/lib/orders/order-status";
import { buildOrderStatusUpdateWhatsAppMessage } from "@/lib/orders/order-status-whatsapp";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { OrderWhatsAppComposer } from "@/components/dashboard/orders/OrderWhatsAppComposer";
import { cn } from "@/lib/cn";

interface OrderStatusWhatsAppPromptProps {
  order: CatalogOrder;
  storeName: string;
  newEstado: OrderEstado;
  onDismiss: () => void;
  className?: string;
  compact?: boolean;
}

export function OrderStatusWhatsAppPrompt({
  order,
  storeName,
  newEstado,
  onDismiss,
  className,
  compact = false,
}: OrderStatusWhatsAppPromptProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  const hasPhone = Boolean(
    normalizeWhatsAppPhone(String(order.customer_phone ?? "")),
  );

  const message = useMemo(
    () =>
      buildOrderStatusUpdateWhatsAppMessage({
        customerName: order.customer_name,
        storeName,
        orderId: order.id,
        newEstado,
      }),
    [order.customer_name, order.id, storeName, newEstado],
  );

  function handleSendClick(event: MouseEvent) {
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
          onClick={handleSendClick}
          disabled={!hasPhone}
          className="orders-status-wa-prompt-action"
          aria-label={
            hasPhone
              ? "Enviar actualización por WhatsApp"
              : "Sin teléfono para WhatsApp"
          }
        >
          <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Enviar actualización por WhatsApp</span>
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
        initialMessage={message}
        onClose={() => {
          setComposerOpen(false);
          onDismiss();
        }}
      />
    </>
  );
}
