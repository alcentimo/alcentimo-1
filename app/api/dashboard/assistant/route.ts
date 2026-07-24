import { NextResponse } from "next/server";
import { answerOwnerAssistantQuestion } from "@/lib/ai/owner-assistant";
import type {
  OwnerAssistantMessage,
  OwnerAssistantRequest,
} from "@/lib/ai/owner-assistant-types";
import { getOwnerAssistantContext } from "@/lib/dashboard/get-owner-assistant-context";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { createClient } from "@/lib/supabase/server";
import { getOpenAiApiKey } from "@/lib/env/server";

export const dynamic = "force-dynamic";

function sanitizeRequestBody(body: unknown): OwnerAssistantRequest | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.messages)) return null;

  const messages: OwnerAssistantMessage[] = raw.messages
    .filter(
      (item): item is OwnerAssistantMessage =>
        typeof item === "object" &&
        item !== null &&
        (item as OwnerAssistantMessage).role !== undefined &&
        typeof (item as OwnerAssistantMessage).content === "string",
    )
    .map((item) => ({
      role: (item.role === "assistant" ? "assistant" : "user") as OwnerAssistantMessage["role"],
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0);

  return { messages };
}

export async function POST(request: Request) {
  if (!getOpenAiApiKey()) {
    return NextResponse.json(
      { error: "El asistente IA no está disponible. Configura OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: OwnerAssistantRequest | null;
  try {
    body = sanitizeRequestBody(await request.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!body || body.messages.length === 0) {
    return NextResponse.json(
      { error: "Escribe tu pregunta para continuar." },
      { status: 400 },
    );
  }

  try {
    const context = await getOwnerAssistantContext({
      storeId: auth.store.id,
      storeSlug: auth.store.slug,
      storeName: auth.store.name,
      storeRubro: auth.store.rubro_tienda,
    });

    const reply = await answerOwnerAssistantQuestion({
      context,
      messages: body.messages,
    });

    return NextResponse.json(
      { reply },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo responder.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
