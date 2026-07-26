import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { suggestProductMetadata } from "@/lib/ai/suggest-product-metadata";

export const dynamic = "force-dynamic";

interface SuggestMetadataBody {
  draftTitle?: string;
  storeRubro?: string | null;
  categories?: Array<{ slug?: string; label?: string }>;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: SuggestMetadataBody;
  try {
    body = (await request.json()) as SuggestMetadataBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const draftTitle = body.draftTitle?.trim() ?? "";
  if (draftTitle.length < 3) {
    return NextResponse.json(
      { error: "Escribe al menos 3 caracteres en el título." },
      { status: 400 },
    );
  }

  const categories = (body.categories ?? [])
    .filter(
      (item): item is { slug: string; label: string } =>
        typeof item.slug === "string" &&
        item.slug.trim().length > 0 &&
        typeof item.label === "string" &&
        item.label.trim().length > 0,
    )
    .map((item) => ({ slug: item.slug.trim(), label: item.label.trim() }));

  if (categories.length === 0) {
    return NextResponse.json(
      { error: "No hay categorías disponibles para sugerir." },
      { status: 400 },
    );
  }

  try {
    const result = await suggestProductMetadata({
      draftTitle,
      storeRubro: body.storeRubro?.trim() || auth.store.rubro_tienda,
      categories,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo analizar el título.";
    const status =
      message.includes("OPENAI") || message.includes("OpenAI") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
