import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import {
  runBcvSyncAttempt,
  type BcvSyncSlot,
} from "@/lib/exchange-rate/sync-bcv-run";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseSyncSlot(request: Request): BcvSyncSlot {
  const slot = new URL(request.url).searchParams.get("slot");
  return slot === "retry" ? "retry" : "midnight";
}

export async function GET(request: Request) {
  const auth = verifyCronRequest(request);

  if (!auth.authorized) {
    console.error("[cron/sync-bcv-rate] No autorizado:", auth.reason, {
      hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
      isVercelCron: request.headers.get("x-vercel-cron") === "1",
    });

    return NextResponse.json(
      {
        error: "No autorizado.",
        detail: auth.reason,
      },
      { status: 401 },
    );
  }

  const slot = parseSyncSlot(request);
  const admin = createAdminClient();
  const result = await runBcvSyncAttempt(admin, slot);

  if (result.success) {
    revalidatePath("/");
    revalidatePath("/tienda", "layout");
    revalidatePath("/c", "layout");
    revalidatePath("/dashboard", "layout");

    return NextResponse.json({
      ok: true,
      slot: result.slot,
      action: result.action,
      sync_date: result.syncDate,
      moneda: "USD",
      tasa: result.rate,
      ultima_actualizacion: result.updatedAt,
    });
  }

  const status = result.action === "awaiting_retry" ? 502 : 503;

  console.error("[cron/sync-bcv-rate] Sincronización fallida:", {
    slot: result.slot,
    action: result.action,
    syncDate: result.syncDate,
    error: result.error,
  });

  return NextResponse.json(
    {
      ok: false,
      slot: result.slot,
      action: result.action,
      sync_date: result.syncDate,
      error: result.error ?? "Falló la sincronización.",
      admin_alert: result.action === "alert_created",
    },
    { status },
  );
}
