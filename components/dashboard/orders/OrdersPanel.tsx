"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { computeOrdersKpis, groupActiveOrdersByDay, isOrderToday } from "@/lib/orders/order-kpis";
import type { CatalogOrder } from "@/lib/orders/types";
import {
  matchesOrderFilter,
  sortOrdersByBusinessRules,
  isCompletedOrderEstado,
  type OrderEstado,
  type OrderFilterId,
} from "@/lib/orders/order-status";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";
import { OrderStatusSelect } from "@/components/dashboard/orders/OrderStatusSelect";
import { OrderStatusWhatsAppPrompt } from "@/components/dashboard/orders/OrderStatusWhatsAppPrompt";
import { OrderDetailSlideOver } from "@/components/dashboard/orders/OrderDetailSlideOver";
import { OrderWhatsAppButton } from "@/components/dashboard/orders/OrderWhatsAppButton";
import { OrderWhatsAppComposer } from "@/components/dashboard/orders/OrderWhatsAppComposer";
import { OrdersKpiRow } from "@/components/dashboard/orders/OrdersKpiRow";
import { OrderCustomerKindBadge } from "@/components/dashboard/orders/OrderCustomerKindBadge";
import { Button } from "@/components/ui/button";
import { fetchStoreOrdersPage } from "@/lib/orders/actions";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";
import type { StoreLocation } from "@/lib/locations/types";
import { formatOrderShippingSummary } from "@/lib/orders/shipping-display";
import { renderOrderWhatsAppMessage } from "@/lib/orders/render-order-message";
import { suggestOrderMessageIntent } from "@/lib/ai/order-message-types";
import { cn } from "@/lib/cn";

type OrderWhatsAppSession = {
  orderId: string;
  newEstado?: OrderEstado;
};

const FILTER_TABS: { id: OrderFilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "verify", label: "Por verificar pago" },
  { id: "processing", label: "Pago aprobado" },
  { id: "logistics", label: "En preparación" },
  { id: "shipped", label: "Enviados" },
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
  initialTotalCount?: number;
  initialHasMore?: boolean;
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
  locations?: StoreLocation[];
}

function formatOrderLocation(order: CatalogOrder): string | null {
  const shippingSummary = formatOrderShippingSummary(order);
  if (shippingSummary) return shippingSummary;

  if (!order.location_name) return null;
  if (order.fulfillment_type === "pickup") {
    return `Retiro: ${order.location_name}`;
  }
  return order.location_name;
}

function OrderSectionLabel({ label }: { label: string }) {
  return (
    <div
      className="orders-ops-section-label"
      role="presentation"
    >
      {label}
    </div>
  );
}

const OrderRow = memo(function OrderRow({
  order,
  onSelect,
  onEstadoUpdated,
  onOpenWhatsApp,
  dimmed = false,
  pendingStatusNotifyEstado,
  onDismissStatusNotify,
  showLocationColumn = false,
}: {
  order: CatalogOrder;
  onSelect: (orderId: string) => void;
  onEstadoUpdated: (
    orderId: string,
    estado: OrderEstado,
    context?: {
      previousEstado: OrderEstado;
      trackingNumber?: string | null;
    },
  ) => void;
  onOpenWhatsApp: (orderId: string, newEstado?: OrderEstado) => void;
  pendingStatusNotifyEstado?: OrderEstado;
  onDismissStatusNotify?: () => void;
  dimmed?: boolean;
  showLocationColumn?: boolean;
}) {
  return (
    <tr
      className={cn("orders-ops-row group", dimmed && "opacity-60")}
      onClick={() => onSelect(order.id)}
    >
      <td className="orders-ops-cell">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {order.customer_name}
          </p>
          <OrderCustomerKindBadge order={order} />
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
          {summarizeItems(order)}
        </p>
        {formatOrderLocation(order) ? (
          <p className="mt-0.5 text-[11px] text-teal-700 dark:text-teal-400">
            {formatOrderLocation(order)}
          </p>
        ) : null}
      </td>
      <td className="orders-ops-cell">
        <OrderStatusSelect
          orderId={order.id}
          estado={order.estado}
          trackingNumber={order.tracking_number}
          onEstadoUpdated={onEstadoUpdated}
        />
        {pendingStatusNotifyEstado && onDismissStatusNotify ? (
          <OrderStatusWhatsAppPrompt
            order={order}
            onDismiss={onDismissStatusNotify}
            onOpenRequest={() =>
              onOpenWhatsApp(order.id, pendingStatusNotifyEstado)
            }
            className="mt-2"
          />
        ) : null}
      </td>
      <td className="orders-ops-cell tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
        {formatUsd(order.total_usd)}
      </td>
      {showLocationColumn ? (
        <td className="orders-ops-cell hidden text-xs text-zinc-600 xl:table-cell dark:text-zinc-300">
          {order.location_name ?? "—"}
        </td>
      ) : null}
      <td className="orders-ops-cell hidden text-zinc-500 lg:table-cell">
        {formatOrderDate(order.created_at)}
      </td>
      <td className="orders-ops-cell hidden sm:table-cell">
        <OrderWhatsAppButton
          order={order}
          compact
          onOpenRequest={() => onOpenWhatsApp(order.id)}
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
  onSelect,
  onEstadoUpdated,
  onOpenWhatsApp,
  dimmed = false,
  pendingStatusNotifyEstado,
  onDismissStatusNotify,
}: {
  order: CatalogOrder;
  onSelect: (orderId: string) => void;
  onEstadoUpdated: (
    orderId: string,
    estado: OrderEstado,
    context?: {
      previousEstado: OrderEstado;
      trackingNumber?: string | null;
    },
  ) => void;
  onOpenWhatsApp: (orderId: string, newEstado?: OrderEstado) => void;
  pendingStatusNotifyEstado?: OrderEstado;
  onDismissStatusNotify?: () => void;
  dimmed?: boolean;
}) {
  return (
    <article
      className={cn("orders-mobile-card", dimmed && "opacity-60")}
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
      <div className="orders-mobile-card-header">
        <div className="orders-mobile-card-identity">
          <div className="orders-mobile-card-name-row">
            <p className="orders-mobile-card-name">{order.customer_name}</p>
            <OrderCustomerKindBadge order={order} />
          </div>
          <p className="orders-mobile-card-meta">
            {formatOrderTime(order.created_at)}
            {order.customer_phone ? ` · ${order.customer_phone}` : ""}
          </p>
          {formatOrderLocation(order) ? (
            <p className="orders-mobile-card-location">
              {formatOrderLocation(order)}
            </p>
          ) : null}
        </div>
        <div className="orders-mobile-card-total">
          <p className="orders-mobile-card-amount">{formatUsd(order.total_usd)}</p>
          <ChevronRight
            className="orders-mobile-card-chevron"
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        className="orders-mobile-card-status-row"
        onClick={(event) => event.stopPropagation()}
      >
        <OrderStatusSelect
          orderId={order.id}
          estado={order.estado}
          trackingNumber={order.tracking_number}
          onEstadoUpdated={onEstadoUpdated}
          className="orders-mobile-status-select"
        />
        <OrderWhatsAppButton
          order={order}
          compact
          onOpenRequest={() => onOpenWhatsApp(order.id)}
          className="orders-mobile-card-wa"
        />
      </div>

      {pendingStatusNotifyEstado && onDismissStatusNotify ? (
        <OrderStatusWhatsAppPrompt
          order={order}
          onDismiss={onDismissStatusNotify}
          onOpenRequest={() =>
            onOpenWhatsApp(order.id, pendingStatusNotifyEstado)
          }
          className="orders-mobile-card-notify"
          compact
        />
      ) : null}

      <p className="orders-mobile-card-items">{summarizeItems(order)}</p>
    </article>
  );
});

export function OrdersPanel({
  orders: initialOrders,
  initialTotalCount,
  initialHasMore = false,
  storeName,
  messageTemplates,
  locations = [],
}: OrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [totalCount, setTotalCount] = useState(
    initialTotalCount ?? initialOrders.length,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);

  useEffect(() => {
    setOrders(initialOrders);
    setTotalCount(initialTotalCount ?? initialOrders.length);
  }, [initialOrders, initialTotalCount]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<OrderFilterId>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const multiLocation = locations.filter((loc) => loc.is_active).length > 1;
  const tableColumnCount = multiLocation ? 7 : 6;
  const skipInitialLocationReload = useRef(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [whatsAppSession, setWhatsAppSession] =
    useState<OrderWhatsAppSession | null>(null);
  const [statusNotifyByOrderId, setStatusNotifyByOrderId] = useState<
    Record<string, OrderEstado>
  >({});

  const kpis = useMemo(() => computeOrdersKpis(orders), [orders]);

  const dismissStatusNotify = useCallback((orderId: string) => {
    setStatusNotifyByOrderId((current) => {
      if (!(orderId in current)) return current;
      const next = { ...current };
      delete next[orderId];
      return next;
    });
  }, []);

  const openOrderWhatsApp = useCallback(
    (orderId: string, newEstado?: OrderEstado) => {
      setSelectedOrderId(null);
      setWhatsAppSession({ orderId, newEstado });
    },
    [],
  );

  const closeOrderWhatsApp = useCallback(() => {
    setWhatsAppSession((current) => {
      if (current?.newEstado) {
        const orderId = current.orderId;
        queueMicrotask(() => dismissStatusNotify(orderId));
      }
      return null;
    });
  }, [dismissStatusNotify]);

  const handleEstadoUpdated = useCallback(
    (
      orderId: string,
      estado: OrderEstado,
      context?: {
        previousEstado: OrderEstado;
        trackingNumber?: string | null;
      },
    ) => {
      setOrders((current) =>
        sortOrdersByBusinessRules(
          current.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  estado,
                  ...(context && "trackingNumber" in context
                    ? { tracking_number: context.trackingNumber ?? null }
                    : null),
                }
              : order,
          ),
        ),
      );

      if (
        context?.previousEstado &&
        context.previousEstado !== estado
      ) {
        setStatusNotifyByOrderId((current) => ({
          ...current,
          [orderId]: estado,
        }));
      }
    },
    [],
  );

  const handleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
  }, []);

  const loadMoreOrders = useCallback(async () => {
    if (!hasMore || loadingMore || loadingFilter) return;

    setLoadingMore(true);
    try {
      const result = await fetchStoreOrdersPage({
        offset: orders.length,
        locationId: locationFilter === "all" ? null : locationFilter,
      });
      if (result.error) return;

      setOrders((current) =>
        sortOrdersByBusinessRules([...current, ...result.orders]),
      );
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingFilter, loadingMore, locationFilter, orders.length]);

  const reloadOrdersForLocation = useCallback(async (nextLocationFilter: string) => {
    setLoadingFilter(true);
    try {
      const result = await fetchStoreOrdersPage({
        offset: 0,
        locationId: nextLocationFilter === "all" ? null : nextLocationFilter,
      });
      if (result.error) return;

      setOrders(sortOrdersByBusinessRules(result.orders));
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } finally {
      setLoadingFilter(false);
    }
  }, []);

  useEffect(() => {
    if (skipInitialLocationReload.current) {
      skipInitialLocationReload.current = false;
      return;
    }
    void reloadOrdersForLocation(locationFilter);
  }, [locationFilter, reloadOrdersForLocation]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreOrders();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMoreOrders]);

  const filteredOrders = useMemo(() => {
    const list = orders.filter((order) => {
      if (filter === "today") return isOrderToday(order);
      return matchesOrderFilter(order.estado, filter);
    });

    return sortOrdersByBusinessRules(list);
  }, [orders, filter]);

  const activeOrderGroups = useMemo(() => {
    if (filter !== "all" && filter !== "verify") return null;
    return groupActiveOrdersByDay(filteredOrders);
  }, [filter, filteredOrders]);

  const isOrderDimmed = useCallback(
    (order: CatalogOrder) => isCompletedOrderEstado(order.estado),
    [],
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const whatsAppOrder = useMemo(
    () =>
      whatsAppSession
        ? (orders.find((order) => order.id === whatsAppSession.orderId) ?? null)
        : null,
    [orders, whatsAppSession],
  );

  const whatsAppFallbackMessage = useMemo(() => {
    if (!whatsAppOrder) return "";
    return renderOrderWhatsAppMessage(
      whatsAppOrder,
      messageTemplates,
      storeName,
    );
  }, [whatsAppOrder, messageTemplates, storeName]);

  const whatsAppSuggestedIntent = useMemo(
    () =>
      whatsAppOrder
        ? suggestOrderMessageIntent(whatsAppOrder.estado)
        : "order_confirmation",
    [whatsAppOrder],
  );

  const renderOrderRowProps = useCallback(
    (order: CatalogOrder) => ({
      pendingStatusNotifyEstado: statusNotifyByOrderId[order.id],
      onDismissStatusNotify: statusNotifyByOrderId[order.id]
        ? () => dismissStatusNotify(order.id)
        : undefined,
    }),
    [dismissStatusNotify, statusNotifyByOrderId],
  );

  if (orders.length === 0) {
    return (
      <div className="card-panel text-center">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Aún no hay pedidos
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Comparte tu catálogo o registra una venta manual (WhatsApp, Instagram u otro canal)
          para que Alcéntimo procese el envío.
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

      <div className="mt-4 flex min-w-0 max-w-full flex-wrap items-center gap-2">
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
        {multiLocation ? (
          <label className="inline-flex min-w-0 max-w-full items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <span className="shrink-0 font-medium">Sucursal</span>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              disabled={loadingFilter}
              className="min-h-9 min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              aria-label="Filtrar pedidos por sucursal"
            >
              <option value="all">Todas</option>
              {locations
                .filter((loc) => loc.is_active)
                .map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        {(filter === "today") && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Ver todos
          </button>
        )}
        <span className="w-full text-xs text-zinc-500 sm:ml-auto sm:w-auto">
          {loadingFilter ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Actualizando…
            </span>
          ) : (
            <>
              {filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}
              {locationFilter !== "all" ? ` · ${totalCount} en sucursal` : ""}
            </>
          )}
        </span>
      </div>

      <div className="orders-ops-table-shell mt-4">
        <div className="orders-mobile-list" aria-label="Lista de pedidos">
          {filteredOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No hay pedidos en este filtro.
            </p>
          ) : activeOrderGroups ? (
            activeOrderGroups.map((group) => (
              <div key={group.id} className="orders-ops-day-group">
                <OrderSectionLabel label={group.label} />
                {group.orders.map((order) => (
                  <OrderMobileCard
                    key={order.id}
                    order={order}
                    onSelect={handleSelectOrder}
                    onEstadoUpdated={handleEstadoUpdated}
                    onOpenWhatsApp={openOrderWhatsApp}
                    dimmed={isOrderDimmed(order)}
                    {...renderOrderRowProps(order)}
                  />
                ))}
              </div>
            ))
          ) : (
            filteredOrders.map((order) => (
              <OrderMobileCard
                key={order.id}
                order={order}
                onSelect={handleSelectOrder}
                onEstadoUpdated={handleEstadoUpdated}
                onOpenWhatsApp={openOrderWhatsApp}
                dimmed={isOrderDimmed(order)}
                {...renderOrderRowProps(order)}
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
                {multiLocation ? (
                  <th className="hidden xl:table-cell">Sucursal</th>
                ) : null}
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
                  <td colSpan={tableColumnCount} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No hay pedidos en este filtro.
                  </td>
                </tr>
              ) : activeOrderGroups ? (
                activeOrderGroups.map((group) => (
                  <Fragment key={group.id}>
                    <tr className="orders-ops-section-row">
                      <td colSpan={tableColumnCount}>{group.label}</td>
                    </tr>
                    {group.orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onSelect={handleSelectOrder}
                        onEstadoUpdated={handleEstadoUpdated}
                        onOpenWhatsApp={openOrderWhatsApp}
                        dimmed={isOrderDimmed(order)}
                        showLocationColumn={multiLocation}
                        {...renderOrderRowProps(order)}
                      />
                    ))}
                  </Fragment>
                ))
              ) : (
                filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onSelect={handleSelectOrder}
                    onEstadoUpdated={handleEstadoUpdated}
                    onOpenWhatsApp={openOrderWhatsApp}
                    dimmed={isOrderDimmed(order)}
                    showLocationColumn={multiLocation}
                    {...renderOrderRowProps(order)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-zinc-200/70 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800">
        <span>
          {orders.length} de {totalCount} pedido{totalCount !== 1 ? "s" : ""} cargados
        </span>
        {hasMore ? (
          <div ref={loadMoreRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void loadMoreOrders()}
              className="text-xs"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Cargando…
                </>
              ) : (
                "Cargar más pedidos"
              )}
            </Button>
          </div>
        ) : null}
      </div>

      <OrderDetailSlideOver
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        onOpenWhatsApp={openOrderWhatsApp}
        onEstadoUpdated={handleEstadoUpdated}
        pendingStatusNotifyEstado={
          selectedOrder ? statusNotifyByOrderId[selectedOrder.id] : undefined
        }
        onDismissStatusNotify={
          selectedOrder
            ? () => dismissStatusNotify(selectedOrder.id)
            : undefined
        }
      />

      {whatsAppOrder && whatsAppSession ? (
        <OrderWhatsAppComposer
          open
          customerName={whatsAppOrder.customer_name}
          customerPhone={whatsAppOrder.customer_phone}
          fallbackMessage={whatsAppFallbackMessage}
          orderId={whatsAppOrder.id}
          storeName={storeName}
          initialIntent={whatsAppSuggestedIntent}
          newEstado={whatsAppSession.newEstado}
          onClose={closeOrderWhatsApp}
        />
      ) : null}
    </>
  );
}
