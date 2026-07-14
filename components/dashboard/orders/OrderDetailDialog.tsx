"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import type { CatalogOrder } from "@/lib/orders/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrderStatusSelect } from "@/components/dashboard/orders/OrderStatusSelect";
import type { OrderEstado } from "@/lib/orders/order-status";

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface OrderDetailDialogProps {
  order: CatalogOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEstadoUpdated?: (orderId: string, estado: OrderEstado) => void;
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onEstadoUpdated,
}: OrderDetailDialogProps) {
  if (!order) return null;

  const whatsappUrl = buildCustomerWhatsAppUrl(order.customer_phone, {
    customerName: order.customer_name,
    orderId: order.id,
    totalUsd: order.total_usd,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} containerClassName="max-w-2xl">
      <DialogContent className="relative max-h-[90vh] overflow-y-auto" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Pedido de {order.customer_name}</DialogTitle>
          <DialogDescription>
            {formatOrderDate(order.created_at)} · {formatUsd(order.total_usd)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Cliente
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {order.customer_name}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {order.customer_phone ?? "Sin teléfono registrado"}
            </p>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Hablar por WhatsApp
              </a>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                No hay un teléfono válido para abrir WhatsApp.
              </p>
            )}
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Estado del pedido
            </p>
            <div className="mt-2">
              <OrderStatusSelect
                orderId={order.id}
                estado={order.estado}
                onEstadoUpdated={onEstadoUpdated}
                className="w-full max-w-xs"
              />
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Productos
            </p>
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
            <div className="mt-3 flex items-center justify-between rounded-lg bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 dark:bg-teal-950/30 dark:text-teal-200">
              <span>Total</span>
              <span>{formatUsd(order.total_usd)}</span>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Comprobante de pago
            </p>
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
                    className="h-auto max-h-80 w-full object-contain"
                    unoptimized
                  />
                </a>
                <p className="border-t border-zinc-200 px-3 py-2 text-center text-xs text-zinc-500 dark:border-zinc-800">
                  Toca la imagen para abrirla en tamaño completo
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Sin comprobante adjunto.</p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
