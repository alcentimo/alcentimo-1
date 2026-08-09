import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMarketingAiScanAllStores } from "@/lib/marketing-ai/run-scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron diario: genera sugerencias de promociones/cupones con la IA de Alcéntimo.
 */
export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "No autorizado.", detail: auth.reason },
      { status: 401 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear cliente admin.",
      },
      { status: 500 },
    );
  }

  try {
    const { results, scanned } = await runMarketingAiScanAllStores(admin);
    const created = results.reduce((sum, row) => sum + row.created, 0);
    const errors = results.filter((row) => row.error).length;

    return NextResponse.json({
      ok: true,
      scanned,
      created,
      errors,
      source: auth.source ?? "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Fallo del análisis.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
