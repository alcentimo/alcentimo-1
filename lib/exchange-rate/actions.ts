"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import { runManualBcvSync } from "@/lib/exchange-rate/sync-bcv-run";

export type SyncBcvRateResult = {
  success?: boolean;
  error?: string;
  rate?: number;
  updatedAt?: string;
};

/** Dispara sincronización BCV desde el dashboard (usuario autenticado). */
export async function syncBcvRateManually(): Promise<SyncBcvRateResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo conectar con Supabase (service role).";
    return { error: message };
  }

  logBcvSync("dashboard_manual_sync_requested", {
    userId: auth.authUser.id,
  });

  const result = await runManualBcvSync(admin);

  if (!result.success) {
    return {
      error:
        result.error ??
        "No se pudo obtener la tasa BCV. Intenta de nuevo en unos minutos.",
    };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/");
  revalidatePath("/tienda", "layout");
  revalidatePath("/c", "layout");

  return {
    success: true,
    rate: result.rate,
    updatedAt: result.updatedAt,
  };
}
