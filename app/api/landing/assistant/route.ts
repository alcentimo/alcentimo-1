import { NextResponse } from "next/server";
import { answerLandingAssistantQuestion } from "@/lib/ai/landing-assistant";
import type {
  LandingAssistantMessage,
  LandingAssistantRequest,
} from "@/lib/ai/landing-assistant-types";
import { OpenRouterChatError } from "@/lib/ai/openrouter-client";
import { getOpenAiApiKey } from "@/lib/env/server";

export const dynamic = "force-dynamic";

function sanitizeRequestBody(body: unknown): LandingAssistantRequest | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.messages)) return null;

  const messages: LandingAssistantMessage[] = raw.messages
    .filter(
      (item): item is LandingAssistantMessage =>
        typeof item === "object" &&
        item !== null &&
        ((item as LandingAssistantMessage).role === "user" ||
          (item as LandingAssistantMessage).role === "assistant") &&
        typeof (item as LandingAssistantMessage).content === "string",
    )
    .map((item) => ({
      role: (item.role === "assistant" ? "assistant" : "user") as LandingAssistantMessage["role"],
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0);

  return { messages };
}

export async function POST(request: Request) {
  if (!getOpenAiApiKey()) {
    return NextResponse.json(
      { error: "El asistente IA no está disponible en este momento." },
      { status: 503 },
    );
  }

  let body: LandingAssistantRequest | null;
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
    const result = await answerLandingAssistantQuestion(body);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof OpenRouterChatError
        ? error.message
        : error instanceof Error
          ? error.message
          : "No se pudo obtener respuesta.";
    const status = error instanceof OpenRouterChatError ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
