"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  mapCustomerOrderSummaryFromRow,
  type CustomerOrderSummary,
} from "@/lib/customers/get-customer-orders";
import {
  normalizeOrderEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";
import type { CatalogOrder } from "@/lib/orders/types";

type OrderRealtimeRow = Record<string, unknown>;

function readString(row: OrderRealtimeRow, key: string): string | null {
  const value = row[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parche parcial desde un UPDATE de Realtime (payload.new puede venir incompleto). */
export function patchCustomerOrderSummary(
  current: CustomerOrderSummary,
  row: OrderRealtimeRow,
): CustomerOrderSummary {
  return {
    ...current,
    total_usd:
      typeof row.total_usd === "number"
        ? row.total_usd
        : Number(row.total_usd) || current.total_usd,
    estado:
      row.estado !== undefined
        ? normalizeOrderEstado(row.estado)
        : current.estado,
    created_at:
      typeof row.created_at === "string" ? row.created_at : current.created_at,
    fulfillment_type:
      (row.fulfillment_type as CatalogOrder["fulfillment_type"]) ??
      current.fulfillment_type,
    shipping_method:
      row.shipping_method !== undefined
        ? readString(row, "shipping_method")
        : current.shipping_method,
    shipping_branch_name:
      row.shipping_branch_name !== undefined
        ? readString(row, "shipping_branch_name")
        : current.shipping_branch_name,
    delivery_address:
      row.delivery_address !== undefined
        ? readString(row, "delivery_address")
        : current.delivery_address,
    tracking_number:
      row.tracking_number !== undefined
        ? readString(row, "tracking_number")
        : current.tracking_number,
  };
}

export function patchCustomerOrderDetail(
  current: CatalogOrder,
  row: OrderRealtimeRow,
): CatalogOrder {
  return {
    ...current,
    total_usd:
      typeof row.total_usd === "number"
        ? row.total_usd
        : Number(row.total_usd) || current.total_usd,
    estado:
      row.estado !== undefined
        ? (normalizeOrderEstado(row.estado) as OrderEstado)
        : current.estado,
    fulfillment_type:
      (row.fulfillment_type as CatalogOrder["fulfillment_type"]) ??
      current.fulfillment_type,
    shipping_method:
      row.shipping_method !== undefined
        ? readString(row, "shipping_method")
        : current.shipping_method,
    shipping_branch_code:
      row.shipping_branch_code !== undefined
        ? readString(row, "shipping_branch_code")
        : current.shipping_branch_code,
    shipping_branch_name:
      row.shipping_branch_name !== undefined
        ? readString(row, "shipping_branch_name")
        : current.shipping_branch_name,
    shipping_branch_address:
      row.shipping_branch_address !== undefined
        ? readString(row, "shipping_branch_address")
        : current.shipping_branch_address,
    delivery_address:
      row.delivery_address !== undefined
        ? readString(row, "delivery_address")
        : current.delivery_address,
    tracking_number:
      row.tracking_number !== undefined
        ? readString(row, "tracking_number")
        : current.tracking_number,
    payment_proof_url:
      row.payment_proof_url !== undefined
        ? readString(row, "payment_proof_url")
        : current.payment_proof_url,
  };
}

interface UseCustomerOrdersRealtimeOptions {
  storeId: string;
  userId: string;
  enabled?: boolean;
  onInsert?: (order: CustomerOrderSummary) => void;
  onUpdate?: (orderId: string, row: OrderRealtimeRow) => void;
  onDelete?: (orderId: string) => void;
}

/** Suscripción Realtime a pedidos del cliente en una tienda. */
export function useCustomerOrdersRealtime({
  storeId,
  userId,
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseCustomerOrdersRealtimeOptions): void {
  useEffect(() => {
    if (!enabled || !storeId || !userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`customer-orders:${storeId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as OrderRealtimeRow | null;
            const orderId =
              typeof oldRow?.id === "string" ? oldRow.id : null;
            if (orderId) onDelete?.(orderId);
            return;
          }

          const row = payload.new as OrderRealtimeRow | null;
          if (!row || typeof row.id !== "string") return;
          if (row.customer_user_id !== userId) return;

          if (payload.eventType === "INSERT") {
            onInsert?.(mapCustomerOrderSummaryFromRow(row));
            return;
          }

          onUpdate?.(row.id, row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, onDelete, onInsert, onUpdate, storeId, userId]);
}
