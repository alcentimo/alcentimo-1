import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncBcvTasaToDatabase } from "@/lib/exchange-rate/sync-bcv-tasa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await syncBcvTasaToDatabase(admin);

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Falló la sincronización." }, {
      status: 502,
    });
  }

  revalidatePath("/");
  revalidatePath("/tienda", "layout");
  revalidatePath("/c", "layout");

  return NextResponse.json({
    ok: true,
    moneda: "USD",
    tasa: result.rate,
    ultima_actualizacion: result.updatedAt,
  });
}
