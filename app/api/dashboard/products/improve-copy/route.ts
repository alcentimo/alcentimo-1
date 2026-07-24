import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { improveProductCopy } from "@/lib/ai/improve-product-copy";
import type { ImproveProductCopyFocus } from "@/lib/ai/product-copy-types";

export const dynamic = "force-dynamic";

interface ImproveCopyRequestBody {
  draftTitle?: string;
  draftDescription?: string;
  storeRubro?: string | null;
  categoryLabel?: string | null;
  focus?: ImproveProductCopyFocus;
}

function normalizeFocus(value: unknown): ImproveProductCopyFocus {
  if (value === "title" || value === "description" || value === "all") {
    return value;
  }
  return "all";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: ImproveCopyRequestBody;
  try {
    body = (await request.json()) as ImproveCopyRequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    const result = await improveProductCopy({
      draftTitle: body.draftTitle,
      draftDescription: body.draftDescription,
      storeRubro: body.storeRubro ?? auth.store.rubro_tienda,
      categoryLabel: body.categoryLabel,
      focus: normalizeFocus(body.focus),
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al mejorar el texto.";
    const status = message.includes("OPENAI") || message.includes("OpenAI")
      ? 503
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
