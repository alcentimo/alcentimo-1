"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { computeOrdersKpis, isOrderToday } from "@/lib/orders/order-kpis";
import type { CatalogOrder } from "@/lib/orders/types";
import {
  matchesOrderFilter,
  type OrderEstado,
  type OrderFilterId,
} from "@/lib/orders/order-status";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";
import { OrderStatusSelect } from "@/components/dashboard/orders/OrderStatusSelect";
import { OrderDetailSlideOver } from "@/components/dashboard/orders/OrderDetailSlideOver";
import { OrderWhatsAppButton } from "@/components/dashboard/orders/OrderWhatsAppButton";
import { OrdersKpiRow } from "@/components/dashboard/orders/OrdersKpiRow";
import { cn } from "@/lib/cn";

const FILTER_TABS: { id: OrderFilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Activos" },
  { id: "completed", label: "Entregados" },
];

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOrderTime(value: string): string {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function summarizeItems(order: CatalogOrder): string {
  return order.items
    .map((item) => `${item.quantity}x ${item.product_name}`)
    .join(", ");
}

interface OrdersPanelProps {
  orders: CatalogOrder[];
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
}

const OrderRow = memo(function OrderRow({
  order,
  storeName,
  messageTemplates,
  onSelect,
  onEstadoUpdated,
}: {
  order: CatalogOrder;
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
  onSelect: (orderId: string) => void;
  onEstadoUpdated: (orderId: string, estado: OrderEstado) => void;
}) {
  return (
    <tr
      className="orders-ops-row group"
      onClick={() => onSelect(order.id)}
    >
      <td className="orders-ops-cell">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {order.customer_name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
          {summarizeItems(order)}
        </p>
      </td>
      <td className="orders-ops-cell">
        <OrderStatusSelect
          orderId={order.id}
          estado={order.estado}
          onEstadoUpdated={onEstadoUpdated}
        />
      </td>
      <td className="orders-ops-cell tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
        {formatUsd(order.total_usd)}
      </td>
      <td className="orders-ops-cell hidden text-zinc-500 lg:table-cell">
        {formatOrderDate(order.created_at)}
      </td>
      <td className="orders-ops-cell hidden sm:table-cell">
        <OrderWhatsAppButton
          order={order}
          storeName={storeName}
          messageTemplates={messageTemplates}
          compact
        />
      </td>
      <td className="orders-ops-cell w-8 text-zinc-400">
        <ChevronRight
          className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </td>
    </tr>
  );
});

const OrderMobileCard = memo(function OrderMobileCard({
  order,
  storeName,
  messageTemplates,
  onSelect,
  onEstadoUpdated,
}: {
  order: CatalogOrder;
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {order.customer_name}
            </p>
            <OrderStatusSelect
              orderId={order.id}
              estado={order.estado}
              onEstadoUpdated={onEstadoUpdated}
            />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {formatOrderTime(order.created_at)}
            {order.customer_phone ? ` · ${order.customer_phone}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatUsd(order.total_usd)}
          </p>
          <ChevronRight className="ml-auto mt-1 h-4 w-4 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
        {summarizeItems(order)}
      </p>

      <div
        className="mt-3 flex items-center justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800"
        onClick={(event) => event.stopPropagation()}
      >
        <OrderWhatsAppButton
          order={order}
          storeName={storeName}
          messageTemplates={messageTemplates}
          compact
        />
      </div>
    </article>
  );
});

export function OrdersPanel({
  orders: initialOrders,
  storeName,
  messageTemplates,
}: OrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<OrderFilterId>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const kpis = useMemo(() => computeOrdersKpis(orders), [orders]);

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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter === "today") return isOrderToday(order);
      return matchesOrderFilter(order.estado, filter);
    });
  }, [orders, filter]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

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
      <OrdersKpiRow
        kpis={kpis}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "min-h-9 rounded-full border px-3.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
              )}
            >
              {tab.label}
            </button>
          );
        })}
        {(filter === "today" || filter === "dispatch") && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Ver todos
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-500">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="orders-ops-table-shell mt-4">
        <div className="orders-mobile-list" aria-label="Lista de pedidos">
          {filteredOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No hay pedidos en este filtro.
            </p>
          ) : (
            filteredOrders.map((order) => (
              <OrderMobileCard
                key={order.id}
                order={order}
                storeName={storeName}
                messageTemplates={messageTemplates}
                onSelect={handleSelectOrder}
                onEstadoUpdated={handleEstadoUpdated}
              />
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="orders-ops-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th className="hidden lg:table-cell">Fecha</th>
                <th className="hidden sm:table-cell">
                  <span className="sr-only">WhatsApp</span>
                </th>
                <th className="w-8">
                  <span className="sr-only">Ver</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No hay pedidos en este filtro.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    storeName={storeName}
                    messageTemplates={messageTemplates}
                    onSelect={handleSelectOrder}
                    onEstadoUpdated={handleEstadoUpdated}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailSlideOver
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        storeName={storeName}
        messageTemplates={messageTemplates}
        onClose={() => setSelectedOrderId(null)}
        onEstadoUpdated={handleEstadoUpdated}
      />
    </>
  );
}
