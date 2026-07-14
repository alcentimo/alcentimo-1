"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { ORDER_ESTADO_LABELS } from "@/lib/orders/order-status";
import type { CatalogOrder } from "@/lib/orders/types";
import type { Store } from "@/lib/database.types";
import { OrderStatusSelect } from "@/components/dashboard/orders/OrderStatusSelect";
import { PageContainer } from "@/components/ui/PageContainer";

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

interface PublicOrderDetailPanelProps {
  order: CatalogOrder;
  store: Store;
}

export function PublicOrderDetailPanel({ order, store }: PublicOrderDetailPanelProps) {
  const whatsappUrl = buildCustomerWhatsAppUrl(order.customer_phone, {
    customerName: order.customer_name,
    orderId: order.id,
    totalUsd: order.total_usd,
  });

  return (
    <PageContainer as="main" narrow className="py-8 sm:py-10">
      <header className="page-header">
        <p className="section-label">Pedido recibido</p>
        <h1 className="page-header-title">📦 {order.customer_name}</h1>
        <p className="page-header-desc">
          {store.name} · {formatOrderDate(order.created_at)}
        </p>
      </header>

      <div className="space-y-4">
        <div className="card-panel">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Estado actual
          </p>
          <div className="mt-3">
            <OrderStatusSelect orderId={order.id} estado={order.estado} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Estado: {ORDER_ESTADO_LABELS[order.estado]}
          </p>
        </div>

        <div className="card-panel space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Cliente
            </p>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">
              {order.customer_name}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {order.customer_phone ?? "Sin teléfono"}
            </p>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Hablar por WhatsApp
              </a>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Productos
            </p>
            <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
              {order.items.map((item) => (
                <li
                  key={`${item.product_id}-${item.variant_id}`}
                  className="flex items-start justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {item.quantity} x {item.product_name}
                    </p>
                    {item.variant_name !== "Estándar" && (
                      <p className="text-xs text-zinc-500">{item.variant_name}</p>
                    )}
                  </div>
                  <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                    {formatUsd(item.line_total_usd)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900 dark:bg-teal-950/30 dark:text-teal-200">
              <span>Total</span>
              <span>{formatUsd(order.total_usd)}</span>
            </div>
          </div>
        </div>

        <div className="card-panel">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Comprobante de pago
          </p>
          {order.payment_proof_url ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
              <Image
                src={order.payment_proof_url}
                alt={`Comprobante de ${order.customer_name}`}
                width={800}
                height={600}
                className="h-auto max-h-[28rem] w-full object-contain"
                unoptimized
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Sin comprobante adjunto.</p>
          )}
        </div>

        <p className="text-center text-sm text-zinc-500">
          <Link href="/dashboard/pedidos" className="link-brand">
            Ir al panel de pedidos
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
