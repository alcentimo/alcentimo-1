import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureWebPushConfigured } from "@/lib/notifications/vapid";
import { formatUsd } from "@/lib/format";

export interface NewOrderPushPayload {
  storeId: string;
  orderId: string;
  customerName: string;
  totalUsd: number;
}

/**
 * Envía Web Push a suscripciones de miembros de la tienda.
 * Fire-and-forget: nunca lanza al caller.
 */
export async function sendNewOrderPushNotifications(
  payload: NewOrderPushPayload,
): Promise<void> {
  try {
    if (!ensureWebPushConfigured()) return;

    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("store_id", payload.storeId);

    if (error || !rows?.length) return;

    const body = `${payload.customerName} · ${formatUsd(payload.totalUsd)}`;
    const notification = JSON.stringify({
      title: "Nuevo pedido",
      body,
      url: "/dashboard/pedidos",
      tag: `order-${payload.orderId}`,
    });

    const staleIds: string[] = [];

    await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: {
                p256dh: row.p256dh,
                auth: row.auth,
              },
            },
            notification,
            { TTL: 60 * 60 },
          );
        } catch (err) {
          const statusCode =
            err && typeof err === "object" && "statusCode" in err
              ? Number((err as { statusCode?: number }).statusCode)
              : null;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(row.id);
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleIds);
    }
  } catch {
    // No bloquear el checkout.
  }
}
