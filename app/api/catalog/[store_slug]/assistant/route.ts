import { NextResponse } from "next/server";
import { answerStorefrontAssistantQuestion } from "@/lib/ai/storefront-assistant";
import type {
  StorefrontAssistantMessage,
  StorefrontAssistantRequest,
} from "@/lib/ai/storefront-assistant-types";
import { getStorefrontAssistantContext } from "@/lib/catalog/get-storefront-assistant-context";
import { getOpenAiApiKey } from "@/lib/env/server";

export const dynamic = "force-dynamic";

function sanitizeRequestBody(body: unknown): StorefrontAssistantRequest | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.messages)) return null;

  const messages: StorefrontAssistantMessage[] = raw.messages
    .filter(
      (item): item is StorefrontAssistantMessage =>
        typeof item === "object" &&
        item !== null &&
        (item as StorefrontAssistantMessage).role !== undefined &&
        typeof (item as StorefrontAssistantMessage).content === "string",
    )
    .map((item) => ({
      role: (item.role === "assistant" ? "assistant" : "user") as StorefrontAssistantMessage["role"],
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0);

  return {
    messages,
    locationId:
      typeof raw.locationId === "string" ? raw.locationId.trim() : null,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ store_slug: string }> },
) {
  if (!getOpenAiApiKey()) {
    return NextResponse.json(
      { error: "El asistente no está disponible en este momento." },
      { status: 503 },
    );
  }

  const { store_slug: storeSlug } = await context.params;
  const normalizedSlug = storeSlug.trim().toLowerCase();

  if (!normalizedSlug) {
    return NextResponse.json({ error: "Tienda no válida." }, { status: 400 });
  }

  let body: StorefrontAssistantRequest | null;
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

  const assistantContext = await getStorefrontAssistantContext(normalizedSlug, {
    locationId: body.locationId,
  });

  if (!assistantContext) {
    return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
  }

  try {
    const reply = await answerStorefrontAssistantQuestion({
      context: assistantContext,
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
