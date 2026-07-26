import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  rewriteMessageTemplate,
  type MessageTemplateTone,
} from "@/lib/ai/rewrite-message-template";
import {
  ORDER_MESSAGE_TEMPLATE_KEYS,
  ORDER_MESSAGE_TEMPLATE_LABELS,
} from "@/lib/orders/message-templates";
import type { OrderMessageTemplateKey } from "@/lib/store-settings/types";

export const dynamic = "force-dynamic";

interface RewriteMessageTemplateRequestBody {
  template?: string;
  templateKey?: OrderMessageTemplateKey;
  tone?: MessageTemplateTone;
}

function normalizeTone(value: unknown): MessageTemplateTone {
  if (value === "amigable" || value === "profesional" || value === "cercano") {
    return value;
  }
  return "profesional";
}

function normalizeTemplateKey(value: unknown): OrderMessageTemplateKey | null {
  if (
    typeof value === "string" &&
    ORDER_MESSAGE_TEMPLATE_KEYS.includes(value as OrderMessageTemplateKey)
  ) {
    return value as OrderMessageTemplateKey;
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: RewriteMessageTemplateRequestBody;
  try {
    body = (await request.json()) as RewriteMessageTemplateRequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const templateKey = normalizeTemplateKey(body.templateKey);
  const template = body.template?.trim() ?? "";

  if (!templateKey) {
    return NextResponse.json(
      { error: "Tipo de plantilla no válido." },
      { status: 400 },
    );
  }

  if (!template) {
    return NextResponse.json(
      { error: "La plantilla está vacía." },
      { status: 400 },
    );
  }

  try {
    const result = await rewriteMessageTemplate({
      template,
      templateKey,
      templateLabel: ORDER_MESSAGE_TEMPLATE_LABELS[templateKey],
      tone: normalizeTone(body.tone),
      storeName: auth.store.name,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al personalizar la plantilla.";
    const status =
      message.includes("OPENAI") || message.includes("OpenAI") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
