import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runBcvSyncAttempt,
  type BcvSyncSlot,
} from "@/lib/exchange-rate/sync-bcv-run";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

function parseSyncSlot(request: Request): BcvSyncSlot {
  const slot = new URL(request.url).searchParams.get("slot");
  return slot === "retry" ? "retry" : "midnight";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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
