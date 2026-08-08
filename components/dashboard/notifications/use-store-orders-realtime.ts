"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapCatalogOrderFromRealtimeRow } from "@/lib/notifications/map-order-from-realtime";
import type { CatalogOrder } from "@/lib/orders/types";

type OrderRealtimeRow = Record<string, unknown>;

interface UseStoreOrdersRealtimeOptions {
  storeId: string;
  enabled?: boolean;
  onInsert?: (order: CatalogOrder) => void;
  onUpdate?: (orderId: string, row: OrderRealtimeRow) => void;
}

/** Suscripción Realtime a pedidos de la tienda (panel admin). */
export function useStoreOrdersRealtime({
  storeId,
  enabled = true,
  onInsert,
  onUpdate,
}: UseStoreOrdersRealtimeOptions): void {
  useEffect(() => {
    if (!enabled || !storeId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`store-orders:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;

          const row = payload.new as OrderRealtimeRow | null;
          if (!row || typeof row.id !== "string") return;

          if (payload.eventType === "INSERT") {
            const mapped = mapCatalogOrderFromRealtimeRow(row);
            if (mapped) onInsert?.(mapped);
            return;
          }

          onUpdate?.(row.id, row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, onInsert, onUpdate, storeId]);
}
