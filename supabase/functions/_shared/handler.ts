import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyCronRequest } from "./verify-cron.ts";
import {
  runBcvSyncAttempt,
  type BcvSyncSlot,
} from "./sync-bcv-run.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function parseSyncSlot(request: Request, forcedSlot?: BcvSyncSlot): BcvSyncSlot {
  if (forcedSlot) return forcedSlot;

  const slot = new URL(request.url).searchParams.get("slot");
  return slot === "retry" ? "retry" : "midnight";
}

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno de la función.",
    );
  }

  return createClient(url, serviceRoleKey);
}

export async function serveSyncBcv(
  request: Request,
  forcedSlot?: BcvSyncSlot,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    console.error(
      `[bcv-sync] ${JSON.stringify({
        ts: new Date().toISOString(),
        phase: "edge_unauthorized",
        reason: auth.reason,
      })}`,
    );
    return jsonResponse(
      {
        error: "No autorizado.",
        detail: auth.reason,
      },
      401,
    );
  }

  try {
    const slot = parseSyncSlot(request, forcedSlot);
    console.log(
      `[bcv-sync] ${JSON.stringify({
        ts: new Date().toISOString(),
        phase: "edge_start",
        slot,
        authSource: auth.source,
      })}`,
    );
    const admin = createAdminClient();
    const result = await runBcvSyncAttempt(admin, slot);

    if (result.success) {
      console.log(
        `[bcv-sync] ${JSON.stringify({
          ts: new Date().toISOString(),
          phase: "edge_success",
          slot: result.slot,
          action: result.action,
          syncDate: result.syncDate,
          rate: result.rate,
        })}`,
      );
      return jsonResponse({
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

    console.error(
      `[bcv-sync] ${JSON.stringify({
        ts: new Date().toISOString(),
        phase: "edge_failed",
        ...result,
      })}`,
    );

    return jsonResponse(
      {
        ok: false,
        slot: result.slot,
        action: result.action,
        sync_date: result.syncDate,
        error: result.error ?? "Falló la sincronización.",
        admin_alert: result.action === "alert_created",
      },
      status,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    console.error(
      `[bcv-sync] ${JSON.stringify({
        ts: new Date().toISOString(),
        phase: "edge_exception",
        error: message,
      })}`,
    );
    return jsonResponse({ error: message }, 500);
  }
}
