"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import type { CatalogOrder } from "@/lib/orders/types";
import {
  matchesOrderFilter,
  type OrderEstado,
  type OrderFilterId,
} from "@/lib/orders/order-status";
import { OrderStatusSelect } from "@/components/dashboard/orders/OrderStatusSelect";
import { OrderDetailDialog } from "@/components/dashboard/orders/OrderDetailDialog";
import { cn } from "@/lib/cn";

const FILTER_TABS: { id: OrderFilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "completed", label: "Completados" },
];

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function summarizeItems(order: CatalogOrder): string {
  return order.items
    .map((item) => `${item.quantity}x ${item.product_name}`)
    .join(", ");
}

interface OrdersPanelProps {
  orders: CatalogOrder[];
}

const OrderWhatsAppLink = memo(function OrderWhatsAppLink({
  customerName,
  customerPhone,
  compact = false,
}: {
  customerName: string;
  customerPhone: string | null;
  compact?: boolean;
}) {
  const whatsappUrl = buildCustomerWhatsAppUrl(customerPhone);

  if (!whatsappUrl) {
    return <span className="text-xs text-zinc-400">Sin teléfono</span>;
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 font-medium text-teal-800 transition-colors hover:bg-teal-100 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-300",
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
      )}
      aria-label={`WhatsApp con ${customerName}`}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      WhatsApp
    </a>
  );
});

const OrderRow = memo(function OrderRow({
  order,
  onSelect,
  onEstadoUpdated,
}: {
  order: CatalogOrder;
  onSelect: (orderId: string) => void;
  onEstadoUpdated: (orderId: string, estado: OrderEstado) => void;
}) {
  return (
    <tr
      className="cursor-pointer bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/60"
      onClick={() => onSelect(order.id)}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {order.customer_name}
        </p>
        {order.customer_phone && (
          <p className="mt-0.5 text-xs text-zinc-500">{order.customer_phone}</p>
        )}
      </td>
      <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-300">
        <span className="line-clamp-2">{summarizeItems(order)}</span>
      </td>
      <td className="px-4 py-3 tabular-nums text-zinc-900 dark:text-zinc-50">
        {formatUsd(order.total_usd)}
      </td>
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <OrderStatusSelect
          orderId={order.id}
          estado={order.estado}
          onEstadoUpdated={onEstadoUpdated}
        />
      </td>
      <td className="px-4 py-3 text-zinc-500">{formatOrderDate(order.created_at)}</td>
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <OrderWhatsAppLink
          customerName={order.customer_name}
          customerPhone={order.customer_phone}
        />
      </td>
    </tr>
  );
});

const OrderMobileCard = memo(function OrderMobileCard({
  order,
  onSelect,
  onEstadoUpdated,
}: {
  order: CatalogOrder;
  onSelect: (orderId: string) => void;
  onEstadoUpdated: (orderId: string, estado: OrderEstado) => void;
}) {
  return (
    <article
      className="orders-mobile-card"
      onClick={() => onSelect(order.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(order.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {order.customer_name}
          </p>
          {order.customer_phone ? (
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {order.customer_phone}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-zinc-500">
            {formatOrderDate(order.created_at)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatUsd(order.total_usd)}
          </p>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
        {summarizeItems(order)}
      </p>

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800"
        onClick={(event) => event.stopPropagation()}
      >
        <OrderStatusSelect
          orderId={order.id}
          estado={order.estado}
          onEstadoUpdated={onEstadoUpdated}
          className="max-w-full min-w-0 flex-1"
        />
        <OrderWhatsAppLink
          customerName={order.customer_name}
          customerPhone={order.customer_phone}
          compact
        />
      </div>
    </article>
  );
});

export function OrdersPanel({ orders: initialOrders }: OrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<OrderFilterId>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleEstadoUpdated = useCallback((orderId: string, estado: OrderEstado) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, estado } : order,
      ),
    );
  }, []);

  const handleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order.estado, filter)),
    [orders, filter],
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const mobileOrderList = useMemo(() => {
    if (filteredOrders.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-zinc-500">
          No hay pedidos en este filtro.
        </p>
      );
    }

    return filteredOrders.map((order) => (
      <OrderMobileCard
        key={order.id}
        order={order}
        onSelect={handleSelectOrder}
        onEstadoUpdated={handleEstadoUpdated}
      />
    ));
  }, [filteredOrders, handleSelectOrder, handleEstadoUpdated]);

  if (initialOrders.length === 0) {
    return (
      <div className="card-panel text-center">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Aún no hay pedidos del catálogo público
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Comparte tu enlace{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
            /c/tu-tienda
          </code>{" "}
          para que los clientes puedan comprar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
              )}
            >
              {tab.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-zinc-500">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="card-panel overflow-hidden p-0">
        <div className="orders-mobile-list" aria-label="Lista de pedidos">
          {mobileOrderList}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    No hay pedidos en este filtro.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onSelect={handleSelectOrder}
                    onEstadoUpdated={handleEstadoUpdated}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        onEstadoUpdated={handleEstadoUpdated}
      />
    </>
  );
}
