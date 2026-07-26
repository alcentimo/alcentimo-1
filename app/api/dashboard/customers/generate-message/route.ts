import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import type { CustomerMessageGoal } from "@/lib/ai/customer-message-types";
import { generateCustomerWhatsAppMessage } from "@/lib/ai/generate-customer-whatsapp-message";
import { computeDaysSinceLastOrder } from "@/lib/customers/customer-segments";
import { getStoreCustomerByUserId } from "@/lib/customers/get-store-customers";
import { isStoreOwner } from "@/lib/stores/owner-access";

export const dynamic = "force-dynamic";

interface GenerateCustomerMessageRequestBody {
  customerUserId?: string;
  goal?: CustomerMessageGoal;
}

function normalizeGoal(value: unknown): CustomerMessageGoal {
  if (value === "reactivacion" || value === "agradecimiento") {
    return value;
  }
  return "agradecimiento";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (!isStoreOwner(auth.store, auth.authUser.id)) {
    return NextResponse.json(
      { error: "Solo el dueño de la tienda puede generar mensajes para clientes." },
      { status: 403 },
    );
  }

  let body: GenerateCustomerMessageRequestBody;
  try {
    body = (await request.json()) as GenerateCustomerMessageRequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const customerUserId = body.customerUserId?.trim() ?? "";
  if (!customerUserId) {
    return NextResponse.json({ error: "Cliente no válido." }, { status: 400 });
  }

  try {
    const customer = await getStoreCustomerByUserId(auth.store.id, customerUserId);
    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado en esta tienda." },
        { status: 404 },
      );
    }

    const goal = normalizeGoal(body.goal);
    const result = await generateCustomerWhatsAppMessage({
      customerName: customer.displayName?.trim() || "cliente",
      orderCount: customer.orderCount,
      totalSpentUsd: customer.totalSpentUsd,
      lastOrderAt: customer.lastOrderAt,
      daysSinceLastOrder: computeDaysSinceLastOrder(customer.lastOrderAt),
      storeName: auth.store.name,
      goal,
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
