"use client";

import type { MouseEvent } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import type { CatalogOrder } from "@/lib/orders/types";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { cn } from "@/lib/cn";

interface OrderStatusWhatsAppPromptProps {
  order: CatalogOrder;
  onDismiss: () => void;
  onOpenRequest: () => void;
  className?: string;
  compact?: boolean;
}

export function OrderStatusWhatsAppPrompt({
  order,
  onDismiss,
  onOpenRequest,
  className,
  compact = false,
}: OrderStatusWhatsAppPromptProps) {
  const hasPhone = Boolean(
    normalizeWhatsAppPhone(String(order.customer_phone ?? "")),
  );

  function handlePreviewClick(event: MouseEvent) {
    event.stopPropagation();
    if (!hasPhone) return;
    onOpenRequest();
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
    </>
  );
}
