"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Recarga la liquidación cuando cambian pedidos reales de la tienda
 * (nuevas ventas mayoristas o cambio de estado a pago confirmado).
 */
export function useStoreOrdersRealtimeRefresh(
  storeId: string | null | undefined,
): void {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!storeId) return;

    function scheduleRefresh() {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        router.refresh();
      }, 400);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`dropship-settlement-orders:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          scheduleRefresh();
        },
      )
      .subscribe();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        scheduleRefresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [router, storeId]);
}
