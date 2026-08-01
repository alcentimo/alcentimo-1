import { NextResponse } from "next/server";
import { answerAdminAssistantQuestion } from "@/lib/ai/admin-assistant";
import type {
  AdminAssistantMessage,
  AdminAssistantRequest,
} from "@/lib/ai/admin-assistant-types";
import { getAdminAssistantContext } from "@/lib/admin/get-admin-assistant-context";
import { getOpenAiApiKey } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import {
  isSupportAdmin,
  resolveAuthEmail,
} from "@/lib/support/is-support-admin";

export const dynamic = "force-dynamic";

function sanitizeRequestBody(body: unknown): AdminAssistantRequest | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.messages)) return null;

  const messages: AdminAssistantMessage[] = raw.messages
    .filter(
      (item): item is AdminAssistantMessage =>
        typeof item === "object" &&
        item !== null &&
        (item as AdminAssistantMessage).role !== undefined &&
        typeof (item as AdminAssistantMessage).content === "string",
    )
    .map((item) => ({
      role: (item.role === "assistant" ? "assistant" : "user") as AdminAssistantMessage["role"],
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0);

  return { messages };
}

export async function POST(request: Request) {
  if (!getOpenAiApiKey()) {
    return NextResponse.json(
      {
        error:
          "El asistente IA no está disponible. Configura OPENAI_API_KEY (OpenRouter).",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return NextResponse.json(
      { error: "No autorizado. Solo administradores de soporte." },
      { status: 403 },
    );
  }

  let body: AdminAssistantRequest | null;
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

  const latestUserMessage = [...body.messages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  try {
    const context = await getAdminAssistantContext(latestUserMessage);
    const reply = await answerAdminAssistantQuestion({
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
