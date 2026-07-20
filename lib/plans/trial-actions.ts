"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { isEligiblePlanForProTrial } from "@/lib/plans/plan-activation";
import { isProTrialClaimCodeValid } from "@/lib/plans/trial-unlock";

export type StartProTrialResult =
  | { ok: true; endsAt: string }
  | { ok: false; error: string };

function revalidateTrialPaths() {
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard", "layout");
}

async function activateProTrialViaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StartProTrialResult> {
  const { data, error } = await supabase.rpc("start_pro_trial", {
    p_user_id: userId,
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

  return { ok: true, endsAt };
}

/** Respaldo con service role si el RPC no está disponible. */
async function activateProTrialViaAdmin(
  userId: string,
): Promise<StartProTrialResult> {
  const admin = createAdminClient();
  const startedAt = new Date();
  const endsAt = new Date(startedAt);
  endsAt.setMonth(endsAt.getMonth() + 1);

  const { data, error } = await admin
    .from("profiles")
    .update({
      plan: "FREE",
      subscription_status: "none",
      pro_trial_started_at: startedAt.toISOString(),
      pro_trial_ends_at: endsAt.toISOString(),
    })
    .eq("id", userId)
    .is("pro_trial_started_at", null)
    .select("pro_trial_ends_at, plan, subscription_status")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.pro_trial_ends_at) {
    return {
      ok: false,
      error: "Ya usaste tu mes de prueba Pro.",
    };
  }

  return { ok: true, endsAt: data.pro_trial_ends_at };
}

export async function startProTrial(
  claimCode: string,
): Promise<StartProTrialResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const userId = auth.authUser.id;

  if (!isProTrialClaimCodeValid(claimCode)) {
    return {
      ok: false,
      error: "Escribe ALCENTIMO para reclamar tu premio.",
    };
  }

  const store = await getUserStore(supabase, userId);
  if (!store) {
    return {
      ok: false,
      error: "Necesitas una tienda para activar la prueba Pro.",
    };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("plan, subscription_status, pro_trial_started_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      ok: false,
      error: profileError?.message ?? "No se encontró tu perfil.",
    };
  }

  if (!isEligiblePlanForProTrial(profile)) {
    const plan = (profile.plan ?? "FREE").toString().toUpperCase();
    const status = profile.subscription_status ?? "none";

    if (status !== "none") {
      return {
        ok: false,
        error: "La prueba gratuita requiere una cuenta sin suscripción activa.",
      };
    }

    if (plan !== "FREE") {
      return {
        ok: false,
        error:
          "La prueba gratuita solo aplica al plan Gratis. Tu plan actual no es elegible.",
      };
    }

    return {
      ok: false,
      error: "Ya usaste tu mes de prueba Pro.",
    };
  }

  let activation = await activateProTrialViaRpc(supabase, userId);

  if (
    !activation.ok &&
    (activation.error.includes("function") ||
      activation.error.includes("does not exist"))
  ) {
    activation = await activateProTrialViaAdmin(userId);
  }

  if (!activation.ok) {
    return activation;
  }

  revalidateTrialPaths();

  return activation;
}
