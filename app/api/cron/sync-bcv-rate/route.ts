import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import {
  runBcvSyncAttempt,
  type BcvSyncSlot,
} from "@/lib/exchange-rate/sync-bcv-run";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseSyncSlot(request: Request): BcvSyncSlot {
  const slot = new URL(request.url).searchParams.get("slot");
  if (slot === "morning") return "morning";
  if (slot === "retry") return "retry";
  return "midnight";
}

function scheduleNoteForSlot(slot: BcvSyncSlot): string {
  if (slot === "morning") return "06:00 America/Caracas (UTC 10:00)";
  if (slot === "retry") return "12:00 America/Caracas (UTC 16:00)";
  return "01:00 America/Caracas (UTC 05:00)";
}

async function handleSync(request: Request) {
  const auth = verifyCronRequest(request);

  if (!auth.authorized) {
    logBcvSync(
      "cron_unauthorized",
      {
        reason: auth.reason,
        isVercelCron: request.headers.get("x-vercel-cron") === "1",
      },
      "error",
    );

    return NextResponse.json(
      {
        error: "No autorizado.",
        detail: auth.reason,
      },
      { status: 401 },
    );
  }

  const slot = parseSyncSlot(request);

  logBcvSync("cron_start", {
    slot,
    source: auth.source ?? "unknown",
    isVercelCron: request.headers.get("x-vercel-cron") === "1",
    scheduleNote: scheduleNoteForSlot(slot),
  });

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear cliente admin.";
    logBcvSync("cron_admin_client_error", { slot, error: message }, "error");
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const result = await runBcvSyncAttempt(admin, slot);

  if (result.success) {
    logBcvSync("cron_success", {
      slot: result.slot,
      action: result.action,
      syncDate: result.syncDate,
      rate: result.rate,
      updatedAt: result.updatedAt,
    });

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

  logBcvSync(
    "cron_failed",
    {
      slot: result.slot,
      action: result.action,
      syncDate: result.syncDate,
      error: result.error,
    },
    "error",
  );

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

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
