"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

interface OrderNotificationsProviderProps {
  storeId: string | null;
  children: ReactNode;
}

export function OrderNotificationsProvider({
  storeId,
  children,
}: OrderNotificationsProviderProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<CatalogOrder[]>([]);
  const [toastOrder, setToastOrder] = useState<CatalogOrder | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setUnreadCount(0);
      return;
    }
    setUnreadCount(readUnread(storeId));
  }, [storeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator &&
      window.isSecureContext;
    setPushSupported(supported);
    if (!supported || !storeId) return;

    void getMyPushSubscriptionStatusAction().then((status) => {
      setPushEnabled(status.hasSubscription && status.vapidConfigured);
      if (!status.vapidConfigured) setPushSupported(false);
    });
  }, [storeId]);

  const clearUnread = useCallback(() => {
    if (!storeId) return;
    setUnreadCount(0);
    writeUnread(storeId, 0);
  }, [storeId]);

  const onPushEnabled = useCallback(() => {
    setPushEnabled(true);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/dashboard/pedidos")) {
      clearUnread();
    }
  }, [clearUnread, pathname]);

  const handleInsert = useCallback(
    (order: CatalogOrder) => {
      setRecentOrders((current) => {
        if (current.some((item) => item.id === order.id)) return current;
        return [order, ...current].slice(0, 8);
      });

      const onPedidos = pathname?.startsWith("/dashboard/pedidos");
      if (!onPedidos) {
        setUnreadCount((count) => {
          const next = count + 1;
          if (storeId) writeUnread(storeId, next);
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
    [pathname, storeId],
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
    storeId: storeId ?? "",
    enabled: Boolean(storeId),
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  const value = useMemo(
    () => ({
      unreadCount,
      clearUnread,
      recentOrders,
      pushEnabled,
      pushSupported,
      onPushEnabled,
      storeId,
    }),
    [
      clearUnread,
      onPushEnabled,
      pushEnabled,
      pushSupported,
      recentOrders,
      storeId,
      unreadCount,
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
