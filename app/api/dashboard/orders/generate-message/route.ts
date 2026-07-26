import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { generateOrderWhatsAppMessage } from "@/lib/ai/generate-order-whatsapp-message";
import type { OrderWhatsAppMessageIntent } from "@/lib/ai/order-message-types";
import { getStoreOrderById } from "@/lib/orders/get-store-orders";
import { formatOrderPublicId } from "@/lib/orders/order-status-whatsapp";
import { isValidOrderEstado, type OrderEstado } from "@/lib/orders/order-status";
import { formatOrderProductSummary } from "@/lib/orders/render-order-message";
import { isStoreOwner } from "@/lib/stores/owner-access";

export const dynamic = "force-dynamic";

interface GenerateOrderMessageRequestBody {
  orderId?: string;
  newEstado?: OrderEstado;
  intent?: OrderWhatsAppMessageIntent;
}

function normalizeIntent(
  value: unknown,
  newEstado?: OrderEstado,
): OrderWhatsAppMessageIntent {
  if (value === "general" || value === "status_update") return value;
  return newEstado ? "status_update" : "general";
}

function normalizeEstado(value: unknown): OrderEstado | undefined {
  if (typeof value === "string" && isValidOrderEstado(value)) {
    return value;
  }
  return undefined;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (!isStoreOwner(auth.store, auth.authUser.id)) {
    return NextResponse.json(
      { error: "Solo el dueño de la tienda puede generar mensajes de pedidos." },
      { status: 403 },
    );
  }

  let body: GenerateOrderMessageRequestBody;
  try {
    body = (await request.json()) as GenerateOrderMessageRequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const orderId = body.orderId?.trim() ?? "";
  if (!orderId) {
    return NextResponse.json({ error: "Pedido no válido." }, { status: 400 });
  }

  const newEstado = normalizeEstado(body.newEstado);
  const intent = normalizeIntent(body.intent, newEstado);

  try {
    const order = await getStoreOrderById(auth.store.id, orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado en esta tienda." },
        { status: 404 },
      );
    }

    const result = await generateOrderWhatsAppMessage({
      customerName: order.customer_name,
      storeName: auth.store.name,
      orderReference: formatOrderPublicId(order.id),
      totalUsd: order.total_usd,
      productsSummary: formatOrderProductSummary(order),
      currentEstado: order.estado,
      newEstado: intent === "status_update" ? newEstado ?? order.estado : undefined,
      intent,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al generar el mensaje.";
    const status =
      message.includes("OPENAI") || message.includes("OpenAI") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
