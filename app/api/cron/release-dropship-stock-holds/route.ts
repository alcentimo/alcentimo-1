import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseExpiredDropshipStockHolds } from "@/lib/dropship/supplier-stock";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Libera reservas de carrito dropship vencidas (20 min) y reincorpora
 * el stock al inventario global de Alcéntimo y de las vitrinas.
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
    const result = await releaseExpiredDropshipStockHolds(admin);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      released: result.affectedIds.length,
      affectedIds: result.affectedIds,
      source: auth.source ?? "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Fallo al liberar reservas de stock.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
