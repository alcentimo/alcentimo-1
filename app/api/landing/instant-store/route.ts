import { NextResponse } from "next/server";
import { generateLandingInstantStore } from "@/lib/ai/landing-instant-store-assistant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;

  const rawHint = record?.businessHint;
  const businessHint = typeof rawHint === "string" ? rawHint.trim() : "";

  if (businessHint.length < 3) {
    return NextResponse.json(
      { error: "Describe tu negocio en al menos 3 caracteres." },
      { status: 400 },
    );
  }

  if (businessHint.length > 120) {
    return NextResponse.json(
      { error: "La descripción es demasiado larga (máx. 120 caracteres)." },
      { status: 400 },
    );
  }

  try {
    const result = await generateLandingInstantStore(businessHint);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar la vista previa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
