"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapStoreCustomerSummaryFromProfileRow } from "@/lib/customers/store-customer-shared";
import type { StoreCustomerSummary } from "@/lib/customers/store-customer-stats";

type ProfileRealtimeRow = Record<string, unknown>;

interface UseStoreCustomersRealtimeOptions {
  storeId: string;
  enabled?: boolean;
  onInsert?: (customer: StoreCustomerSummary) => void;
  onUpdate?: (customerId: string, row: ProfileRealtimeRow) => void;
  onDelete?: (customerId: string) => void;
}

/** Suscripción Realtime a customer_profiles de la tienda (Mis Clientes). */
export function useStoreCustomersRealtime({
  storeId,
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseStoreCustomersRealtimeOptions): void {
  useEffect(() => {
    if (!enabled || !storeId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`store-customers:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_profiles",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as ProfileRealtimeRow | null;
            const customerId =
              typeof oldRow?.id === "string" ? oldRow.id : null;
            if (customerId) onDelete?.(customerId);
            return;
          }

          const row = payload.new as ProfileRealtimeRow | null;
          if (!row || typeof row.id !== "string") return;

          if (payload.eventType === "INSERT") {
            const mapped = mapStoreCustomerSummaryFromProfileRow(row);
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
  }, [enabled, onDelete, onInsert, onUpdate, storeId]);
}
