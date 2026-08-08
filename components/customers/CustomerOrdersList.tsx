"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Package } from "lucide-react";
import { CustomerOrderEstadoPill } from "@/components/customers/CustomerOrderEstadoPill";
import {
  patchCustomerOrderSummary,
  useCustomerOrdersRealtime,
} from "@/components/customers/use-customer-orders-realtime";
import {
  formatCustomerOrderDate,
  formatCustomerOrderPublicId,
  type CustomerOrderSummary,
} from "@/lib/customers/get-customer-orders";
import { formatUsd } from "@/lib/format";
import {
  formatOrderShippingSummary,
  getOrderShippingMethodLabel,
} from "@/lib/orders/shipping-display";
import { getStoreCustomerOrderPath } from "@/lib/store-host";
import type { CatalogOrder } from "@/lib/orders/types";

interface CustomerOrdersListProps {
  storeSlug: string;
  storeId: string;
  userId: string;
  orders: CustomerOrderSummary[];
}

function shippingHint(order: CustomerOrderSummary): string | null {
  const asOrder = {
    fulfillment_type: order.fulfillment_type,
    shipping_method: order.shipping_method,
    shipping_branch_name: order.shipping_branch_name,
    delivery_address: order.delivery_address,
  } as CatalogOrder;

  return (
    formatOrderShippingSummary(asOrder) ??
    getOrderShippingMethodLabel(asOrder)
  );
}

export function CustomerOrdersList({
  storeSlug,
  storeId,
  userId,
  orders: initialOrders,
}: CustomerOrdersListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const onInsert = useCallback((order: CustomerOrderSummary) => {
    setOrders((current) => {
      if (current.some((item) => item.id === order.id)) return current;
      return [order, ...current];
    });
  }, []);

  const onUpdate = useCallback((orderId: string, row: Record<string, unknown>) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? patchCustomerOrderSummary(order, row) : order,
      ),
    );
  }, []);

  const onDelete = useCallback((orderId: string) => {
    setOrders((current) => current.filter((order) => order.id !== orderId));
  }, []);

  useCustomerOrdersRealtime({
    storeId,
    userId,
    onInsert,
    onUpdate,
    onDelete,
  });

  useEffect(() => {
    const refresh = () => router.refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  if (orders.length === 0) {
    return (
      <div className="customer-orders-empty-state">
        <Package className="h-8 w-8 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        <p className="customer-orders-empty">Aún no tienes compras</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Cuando confirmes un pedido con tu cuenta, aparecerá aquí con su
          seguimiento.
        </p>
      </div>
    );
  }

  return (
    <ul className="customer-orders-list">
      {orders.map((order) => {
        const methodHint = shippingHint(order);
        const detailHref = getStoreCustomerOrderPath(storeSlug, order.id);

        return (
          <li key={order.id}>
            <Link href={detailHref} className="customer-orders-item-link">
              <div className="customer-orders-item">
                <div className="customer-orders-item-main">
                  <p className="customer-orders-id">
                    {formatCustomerOrderPublicId(order.id)}
                  </p>
                  <p className="customer-orders-date">
                    {formatCustomerOrderDate(order.created_at)}
                    {order.item_count > 0
                      ? ` · ${order.item_count} ${order.item_count === 1 ? "producto" : "productos"}`
                      : null}
                  </p>
                  {methodHint ? (
                    <p className="customer-orders-shipping">{methodHint}</p>
                  ) : null}
                  {order.tracking_number ? (
                    <p className="customer-orders-tracking">
                      Guía: <strong>{order.tracking_number}</strong>
                    </p>
                  ) : null}
                </div>
                <div className="customer-orders-item-meta">
                  <p className="customer-orders-total">
                    {formatUsd(order.total_usd)}
                  </p>
                  <CustomerOrderEstadoPill estado={order.estado} />
                  <ChevronRight
                    className="hidden h-4 w-4 text-zinc-300 sm:block dark:text-zinc-600"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
