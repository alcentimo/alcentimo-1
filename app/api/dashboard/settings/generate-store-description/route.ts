import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { generateStoreDescription } from "@/lib/ai/generate-store-description";
import {
  getRubroLabel,
  normalizeStoreRubro,
} from "@/src/config/categories";

export const dynamic = "force-dynamic";

interface GenerateStoreDescriptionRequestBody {
  storeName?: string;
  storeRubro?: string | null;
  draftDescription?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: GenerateStoreDescriptionRequestBody;
  try {
    body = (await request.json()) as GenerateStoreDescriptionRequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const storeName = body.storeName?.trim() || auth.store.name;
  const rubroValue = normalizeStoreRubro(
    body.storeRubro?.trim() || auth.store.rubro_tienda,
  );
  const rubroLabel = getRubroLabel(rubroValue);

  try {
    const result = await generateStoreDescription({
      storeName,
      storeRubro: rubroLabel,
      draftDescription: body.draftDescription,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al generar la descripción.";
    const status =
      message.includes("OPENAI") ||
      message.includes("OpenAI") ||
      message.includes("no está configurada")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
