"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { getStoreProductCount } from "@/lib/plans/product-limit";
import {
  isEligiblePlanForProTrial,
  needsProTrialPlanReset,
} from "@/lib/plans/plan-activation";
import {
  isProTrialClaimCodeValid,
  isProTrialUnlockReady,
  PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
} from "@/lib/plans/trial-unlock";

export type StartProTrialResult =
  | { ok: true; endsAt: string }
  | { ok: false; error: string };

function revalidateTrialPaths() {
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard", "layout");
}

/** Activa la prueba Pro vía service role (evita fallos del RPC en producción). */
async function persistProTrialActivation(
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
    .select("pro_trial_ends_at")
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

  const productCount = await getStoreProductCount(store.id);
  if (!isProTrialUnlockReady(productCount, PRO_TRIAL_UNLOCK_PRODUCT_COUNT)) {
    return {
      ok: false,
      error: `Publica al menos ${PRO_TRIAL_UNLOCK_PRODUCT_COUNT} productos para desbloquear la prueba Pro.`,
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

  if (!isEligiblePlanForProTrial(profile, auth.authUser.planId)) {
    return {
      ok: false,
      error: "La prueba gratuita solo aplica al plan Gratis.",
    };
  }

  if (needsProTrialPlanReset(profile)) {
    const { error: resetError } = await admin
      .from("profiles")
      .update({
        plan: "FREE",
        subscription_status: "none",
      })
      .eq("id", userId);

    if (resetError) {
      return { ok: false, error: resetError.message };
    }
  }

  const activation = await persistProTrialActivation(userId);

  if (!activation.ok) {
    return activation;
  }

  revalidateTrialPaths();

  return activation;
}
