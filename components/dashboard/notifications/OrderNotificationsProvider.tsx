"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useStoreOrdersRealtime } from "@/components/dashboard/notifications/use-store-orders-realtime";
import { OrderNotificationBell } from "@/components/dashboard/notifications/OrderNotificationBell";
import { OrderNotificationToast } from "@/components/dashboard/notifications/OrderNotificationToast";
import {
  ORDER_UNREAD_STORAGE_PREFIX,
  STORE_ORDER_INSERT_EVENT,
  STORE_ORDER_UPDATE_EVENT,
} from "@/lib/notifications/constants";
import { playOrderNotificationChime } from "@/lib/notifications/play-order-chime";
import { getMyPushSubscriptionStatusAction } from "@/lib/notifications/push-actions";
import type { CatalogOrder } from "@/lib/orders/types";

interface OrderNotificationsContextValue {
  unreadCount: number;
  clearUnread: () => void;
  recentOrders: CatalogOrder[];
  pushEnabled: boolean;
  pushSupported: boolean;
  onPushEnabled: () => void;
  storeId: string | null;
}

const OrderNotificationsContext =
  createContext<OrderNotificationsContextValue | null>(null);

function readUnread(storeId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(`${ORDER_UNREAD_STORAGE_PREFIX}${storeId}`);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeUnread(storeId: string, count: number): void {
  try {
    sessionStorage.setItem(
      `${ORDER_UNREAD_STORAGE_PREFIX}${storeId}`,
      String(Math.max(0, count)),
    );
  } catch {
    /* ignore */
  }
}

function detectPushSupport(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator &&
    window.isSecureContext
  );
}

interface OrderNotificationsProviderProps {
  storeId: string | null;
  children: ReactNode;
}

function OrderNotificationsProviderInner({
  storeId,
  children,
}: {
  storeId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const onPedidos = Boolean(pathname?.startsWith("/dashboard/pedidos"));
  const [unreadCount, setUnreadCount] = useState(() => readUnread(storeId));
  const [recentOrders, setRecentOrders] = useState<CatalogOrder[]>([]);
  const [toastOrder, setToastOrder] = useState<CatalogOrder | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [vapidConfigured, setVapidConfigured] = useState(true);
  const browserPushSupported = useSyncExternalStore(
    () => () => undefined,
    detectPushSupport,
    () => false,
  );
  const pushSupported = browserPushSupported && vapidConfigured;

  useEffect(() => {
    if (!browserPushSupported) return;
    let cancelled = false;
    void getMyPushSubscriptionStatusAction().then((status) => {
      if (cancelled) return;
      setPushEnabled(status.hasSubscription && status.vapidConfigured);
      setVapidConfigured(status.vapidConfigured);
    });
    return () => {
      cancelled = true;
    };
  }, [browserPushSupported]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    writeUnread(storeId, 0);
  }, [storeId]);

  const onPushEnabled = useCallback(() => {
    setPushEnabled(true);
  }, []);

  // Persistir limpieza al visitar Pedidos (el badge se deriva a 0 en esa ruta).
  useEffect(() => {
    if (!onPedidos) return;
    writeUnread(storeId, 0);
  }, [onPedidos, storeId]);

  const handleInsert = useCallback(
    (order: CatalogOrder) => {
      setRecentOrders((current) => {
        if (current.some((item) => item.id === order.id)) return current;
        return [order, ...current].slice(0, 8);
      });

      if (!onPedidos) {
        setUnreadCount((count) => {
          const next = count + 1;
          writeUnread(storeId, next);
          return next;
        });
      }

      setToastOrder(order);
      playOrderNotificationChime();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(STORE_ORDER_INSERT_EVENT, { detail: order }),
        );
      }

      window.setTimeout(() => {
        setToastOrder((current) => (current?.id === order.id ? null : current));
      }, 8_000);
    },
    [onPedidos, storeId],
  );

  const handleUpdate = useCallback(
    (orderId: string, row: Record<string, unknown>) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(STORE_ORDER_UPDATE_EVENT, {
          detail: { orderId, row },
        }),
      );
    },
    [],
  );

  useStoreOrdersRealtime({
    storeId,
    enabled: true,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  const displayUnread = onPedidos ? 0 : unreadCount;

  const value = useMemo(
    () => ({
      unreadCount: displayUnread,
      clearUnread,
      recentOrders,
      pushEnabled,
      pushSupported,
      onPushEnabled,
      storeId,
    }),
    [
      clearUnread,
      displayUnread,
      onPushEnabled,
      pushEnabled,
      pushSupported,
      recentOrders,
      storeId,
    ],
  );

  return (
    <OrderNotificationsContext.Provider value={value}>
      {children}
      {toastOrder ? (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-end px-3 sm:top-4 sm:px-4">
          <OrderNotificationToast
            order={toastOrder}
            onDismiss={() => setToastOrder(null)}
          />
        </div>
      ) : null}
    </OrderNotificationsContext.Provider>
  );
}

export function OrderNotificationsProvider({
  storeId,
  children,
}: OrderNotificationsProviderProps) {
  if (!storeId) {
    return (
      <OrderNotificationsContext.Provider
        value={{
          unreadCount: 0,
          clearUnread: () => undefined,
          recentOrders: [],
          pushEnabled: false,
          pushSupported: false,
          onPushEnabled: () => undefined,
          storeId: null,
        }}
      >
        {children}
      </OrderNotificationsContext.Provider>
    );
  }

  return (
    <OrderNotificationsProviderInner key={storeId} storeId={storeId}>
      {children}
    </OrderNotificationsProviderInner>
  );
}

export function OrderNotificationBellSlot() {
  const ctx = useContext(OrderNotificationsContext);
  if (!ctx?.storeId) return null;

  return (
    <OrderNotificationBell
      unreadCount={ctx.unreadCount}
      recentOrders={ctx.recentOrders}
      onClearUnread={ctx.clearUnread}
      pushEnabled={ctx.pushEnabled}
      pushSupported={ctx.pushSupported}
      onPushEnabled={ctx.onPushEnabled}
    />
  );
}

export function useOrderNotifications(): OrderNotificationsContextValue {
  const ctx = useContext(OrderNotificationsContext);
  return (
    ctx ?? {
      unreadCount: 0,
      clearUnread: () => undefined,
      recentOrders: [],
      pushEnabled: false,
      pushSupported: false,
      onPushEnabled: () => undefined,
      storeId: null,
    }
  );
}
