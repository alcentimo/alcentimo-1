"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";

export type StartProTrialResult =
  | { ok: true; endsAt: string }
  | { ok: false; error: string };

export async function startProTrial(): Promise<StartProTrialResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const { data, error } = await supabase.rpc("start_pro_trial", {
    p_user_id: auth.authUser.id,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const ok = Boolean(row?.ok);
  const errorMessage =
    typeof row?.error_message === "string" ? row.error_message : null;
  const endsAt =
    typeof row?.trial_ends_at === "string" ? row.trial_ends_at : null;

  if (!ok || !endsAt) {
    return {
      ok: false,
      error: errorMessage ?? "No se pudo activar la prueba Pro.",
    };
  }

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/planes");
  revalidatePath("/activar");

  return { ok: true, endsAt };
}
