"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { CatalogOrder } from "@/lib/orders/types";
import type { OrderEstado } from "@/lib/orders/order-status";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";
import { OrderStatusSelect } from "@/components/dashboard/orders/OrderStatusSelect";
import { OrderStatusWhatsAppPrompt } from "@/components/dashboard/orders/OrderStatusWhatsAppPrompt";
import { OrderShippingDetails } from "@/components/dashboard/orders/OrderShippingDetails";
import { OrderWhatsAppButton } from "@/components/dashboard/orders/OrderWhatsAppButton";

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface OrderDetailSlideOverProps {
  order: CatalogOrder | null;
  open: boolean;
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
  onClose: () => void;
  onEstadoUpdated?: (
    orderId: string,
    estado: OrderEstado,
    context?: { previousEstado: OrderEstado },
  ) => void;
  pendingStatusNotifyEstado?: OrderEstado;
  onDismissStatusNotify?: () => void;
}

export function OrderDetailSlideOver({
  order,
  open,
  storeName,
  messageTemplates,
  onClose,
  onEstadoUpdated,
  pendingStatusNotifyEstado,
  onDismissStatusNotify,
}: OrderDetailSlideOverProps) {
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

  if (!open || !order) return null;

  return (
    <div className="orders-slideover-root" role="presentation">
      <button
        type="button"
        className="orders-slideover-backdrop"
        aria-label="Cerrar detalle del pedido"
        onClick={onClose}
      />

      <aside
        className="orders-slideover-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-slideover-title"
      >
        <header className="orders-slideover-header">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Detalle del pedido
            </p>
            <h2
              id="order-slideover-title"
              className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {order.customer_name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {formatOrderDate(order.created_at)} · {formatUsd(order.total_usd)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="orders-slideover-body">
          <section className="orders-slideover-section">
            <p className="orders-slideover-label">Estado</p>
            <div className="mt-2">
              <OrderStatusSelect
                orderId={order.id}
                estado={order.estado}
                onEstadoUpdated={onEstadoUpdated}
              />
            </div>
            {pendingStatusNotifyEstado && onDismissStatusNotify ? (
              <OrderStatusWhatsAppPrompt
                order={order}
                storeName={storeName}
                newEstado={pendingStatusNotifyEstado}
                onDismiss={onDismissStatusNotify}
                className="mt-3"
              />
            ) : null}
          </section>

          <section className="orders-slideover-section">
            <p className="orders-slideover-label">Cliente</p>
            <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {order.customer_name}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {order.customer_phone ?? "Sin teléfono registrado"}
            </p>
            <OrderShippingDetails order={order} />
            <OrderWhatsAppButton
              order={order}
              storeName={storeName}
              messageTemplates={messageTemplates}
              className="mt-3"
            />
          </section>

          <section className="orders-slideover-section">
            <p className="orders-slideover-label">Productos</p>
            <ul className="mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {order.items.map((item) => (
                <li
                  key={`${item.product_id}-${item.variant_id}`}
                  className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {item.quantity}x {item.product_name}
                    </p>
                    {item.variant_name !== "Estándar" && (
                      <p className="text-xs text-zinc-500">{item.variant_name}</p>
                    )}
                  </div>
                  <span className="shrink-0 tabular-nums text-zinc-700 dark:text-zinc-200">
                    {formatUsd(item.line_total_usd)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <span>Total</span>
              <span>{formatUsd(order.total_usd)}</span>
            </div>
          </section>

          <section className="orders-slideover-section">
            <p className="orders-slideover-label">Comprobante de pago</p>
            {order.payment_proof_url ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
                <a
                  href={order.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Image
                    src={order.payment_proof_url}
                    alt={`Comprobante de ${order.customer_name}`}
                    width={640}
                    height={480}
                    className="h-auto max-h-72 w-full object-contain"
                    unoptimized
                  />
                </a>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Sin comprobante adjunto.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
