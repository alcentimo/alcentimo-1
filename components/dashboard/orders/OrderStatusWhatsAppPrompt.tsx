"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { CatalogOrder } from "@/lib/orders/types";
import type { OrderEstado } from "@/lib/orders/order-status";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { renderOrderWhatsAppMessage } from "@/lib/orders/render-order-message";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";
import { OrderWhatsAppComposer } from "@/components/dashboard/orders/OrderWhatsAppComposer";
import { useOrderAiWhatsAppMessage } from "@/components/dashboard/orders/useOrderAiWhatsAppMessage";
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

  const { message: aiMessage, loading } = useOrderAiWhatsAppMessage({
    orderId: order.id,
    newEstado,
    intent: "status_update",
    enabled: hasPhone,
  });

  const activeMessage = aiMessage ?? fallbackMessage;
  const whatsappUrl = buildCustomerWhatsAppUrl(
    order.customer_phone,
    undefined,
    activeMessage,
  );

  function handleSendClick(event: MouseEvent) {
    event.stopPropagation();
    if (!hasPhone || loading) return;

    if (whatsappUrl) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      onDismiss();
    }
  }

  function handleEditClick(event: MouseEvent) {
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
          disabled={!hasPhone || loading}
          className="orders-status-wa-prompt-action"
          aria-label={
            hasPhone
              ? "Enviar actualización por WhatsApp"
              : "Sin teléfono para WhatsApp"
          }
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            {loading ? "Generando mensaje…" : "Enviar actualización por WhatsApp"}
          </span>
        </button>
        {!loading && hasPhone ? (
          <button
            type="button"
            onClick={handleEditClick}
            className="orders-status-wa-prompt-edit"
            aria-label="Editar mensaje antes de enviar"
          >
            Editar
          </button>
        ) : null}
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
