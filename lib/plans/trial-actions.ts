"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { isEligiblePlanForProTrial } from "@/lib/plans/plan-activation";
import {
  isValidProTrialClaimCode,
  PRO_TRIAL_CLAIM_CODE,
  resolveProTrialStatus,
} from "@/lib/plans/trial";
import {
  assertProTrialContactAvailable,
  recordProTrialClaimArtifacts,
} from "@/lib/plans/pro-trial-abuse";

export type StartProTrialResult =
  | { ok: true; endsAt: string }
  | { ok: false; error: string };

export type TryActivateProTrialResult =
  | { ok: true; activated: true; endsAt: string }
  | {
      ok: true;
      activated: false;
      reason:
        | "not_eligible"
        | "already_active"
        | "already_used"
        | "claim_required"
        | "no_store"
        | "store_already_claimed"
        | "contact_blocked";
      error?: string;
    }
  | { ok: false; error: string };

function revalidateTrialPaths() {
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard", "layout");
}

async function activateProTrialViaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  claimCode: string,
): Promise<StartProTrialResult> {
  const { data, error } = await supabase.rpc("start_pro_trial", {
    p_user_id: userId,
    p_claim_code: claimCode.trim().toUpperCase(),
  });

  if (error) {
    // Firma antigua (solo p_user_id) en entornos sin migración 084.
    if (
      error.message.includes("p_claim_code") ||
      error.message.includes("function") ||
      error.message.includes("does not exist")
    ) {
      const legacy = await supabase.rpc("start_pro_trial", {
        p_user_id: userId,
      });
      if (legacy.error) {
        return { ok: false, error: legacy.error.message };
      }
      const legacyRow = Array.isArray(legacy.data) ? legacy.data[0] : legacy.data;
      const legacyOk = Boolean(legacyRow?.ok);
      const legacyEnds =
        typeof legacyRow?.trial_ends_at === "string"
          ? legacyRow.trial_ends_at
          : null;
      const legacyMsg =
        typeof legacyRow?.error_message === "string"
          ? legacyRow.error_message
          : null;
      if (!legacyOk || !legacyEnds) {
        return {
          ok: false,
          error: legacyMsg ?? "No se pudo activar la prueba Pro.",
        };
      }
      return { ok: true, endsAt: legacyEnds };
    }
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

async function activateProTrialViaAdmin(
  userId: string,
  storeId: string,
  emailNormalized: string,
  phoneNormalized: string,
): Promise<StartProTrialResult> {
  const admin = createAdminClient();
  const startedAt = new Date();
  const endsAt = new Date(startedAt);
  endsAt.setMonth(endsAt.getMonth() + 1);
  const startedIso = startedAt.toISOString();
  const endsIso = endsAt.toISOString();

  const { data, error } = await admin
    .from("profiles")
    .update({
      plan: "FREE",
      subscription_status: "none",
      pro_trial_started_at: startedIso,
      pro_trial_ends_at: endsIso,
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

  const artifacts = await recordProTrialClaimArtifacts({
    storeId,
    ownerUserId: userId,
    emailNormalized,
    phoneNormalized,
    claimedAtIso: startedIso,
  });

  if (!artifacts.ok) {
    // Rollback best-effort del perfil si no pudimos registrar el anti-abuso.
    await admin
      .from("profiles")
      .update({
        pro_trial_started_at: null,
        pro_trial_ends_at: null,
      })
      .eq("id", userId)
      .eq("pro_trial_started_at", startedIso);
    return { ok: false, error: artifacts.error };
  }

  return { ok: true, endsAt: data.pro_trial_ends_at };
}

async function performProTrialActivation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  claimCode: string,
  storeId: string,
  emailNormalized: string,
  phoneNormalized: string,
): Promise<StartProTrialResult> {
  let activation = await activateProTrialViaRpc(supabase, userId, claimCode);

  if (
    !activation.ok &&
    (activation.error.includes("function") ||
      activation.error.includes("does not exist"))
  ) {
    activation = await activateProTrialViaAdmin(
      userId,
      storeId,
      emailNormalized,
      phoneNormalized,
    );
  }

  if (!activation.ok) {
    return activation;
  }

  // Si el RPC antiguo no escribió artifacts, completarlos (idempotente).
  await recordProTrialClaimArtifacts({
    storeId,
    ownerUserId: userId,
    emailNormalized,
    phoneNormalized,
    claimedAtIso: new Date().toISOString(),
  });

  revalidateTrialPaths();
  return activation;
}

/**
 * Activa la prueba Pro si la cuenta es elegible y el usuario escribió
 * la palabra de reclamación ({@link PRO_TRIAL_CLAIM_CODE}).
 * No exige completar onboarding (productos, pagos o envíos).
 */
export async function tryActivateProTrial(options?: {
  claimCode?: string;
}): Promise<TryActivateProTrialResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const userId = auth.authUser.id;
  const store = await getUserStore(supabase, userId);

  if (!store) {
    return { ok: true, activated: false, reason: "no_store" };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("plan, subscription_status, pro_trial_started_at, pro_trial_ends_at, pro_trial_closed_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      ok: false,
      error: profileError?.message ?? "No se encontró tu perfil.",
    };
  }

  const trialStatus = resolveProTrialStatus(profile);

  if (trialStatus.benefitsActive) {
    return { ok: true, activated: false, reason: "already_active" };
  }

  if (profile.pro_trial_started_at != null) {
    return { ok: true, activated: false, reason: "already_used" };
  }

  if (!isEligiblePlanForProTrial(profile)) {
    return { ok: true, activated: false, reason: "not_eligible" };
  }

  if (!isValidProTrialClaimCode(options?.claimCode ?? "")) {
    return { ok: true, activated: false, reason: "claim_required" };
  }

  const contactGuard = await assertProTrialContactAvailable({
    storeId: store.id,
    ownerEmail: auth.authUser.email,
  });

  if (!contactGuard.ok) {
    if (contactGuard.reason === "store_already_claimed") {
      return {
        ok: true,
        activated: false,
        reason: "store_already_claimed",
        error: contactGuard.error,
      };
    }
    return {
      ok: true,
      activated: false,
      reason: "contact_blocked",
      error: contactGuard.error,
    };
  }

  const claimCode = (options?.claimCode ?? "").trim().toUpperCase();
  const activation = await performProTrialActivation(
    supabase,
    userId,
    claimCode,
    store.id,
    contactGuard.emailNormalized,
    contactGuard.phoneNormalized,
  );
  if (!activation.ok) {
    return { ok: false, error: activation.error };
  }

  return { ok: true, activated: true, endsAt: activation.endsAt };
}

export async function startProTrial(claimCode?: string): Promise<StartProTrialResult> {
  if (!isValidProTrialClaimCode(claimCode ?? "")) {
    return {
      ok: false,
      error: `Escribe ${PRO_TRIAL_CLAIM_CODE} exactamente para reclamar tu mes gratis.`,
    };
  }

  const result = await tryActivateProTrial({ claimCode });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  if (result.activated) {
    return { ok: true, endsAt: result.endsAt };
  }

  if (result.reason === "claim_required") {
    return {
      ok: false,
      error: `Escribe ${PRO_TRIAL_CLAIM_CODE} exactamente para reclamar tu mes gratis.`,
    };
  }

  if (result.reason === "already_active") {
    return { ok: false, error: "Ya tienes la prueba Pro activa." };
  }

  if (result.reason === "already_used") {
    return { ok: false, error: "Ya usaste tu mes de prueba Pro." };
  }

  if (result.reason === "store_already_claimed") {
    return {
      ok: false,
      error:
        result.error ?? "Esta tienda ya reclamó la prueba gratis del Plan Profesional.",
    };
  }

  if (result.reason === "contact_blocked") {
    return {
      ok: false,
      error:
        result.error ??
        "Este correo o teléfono ya se usó para reclamar la prueba Pro en otra tienda.",
    };
  }

  if (result.reason === "not_eligible") {
    return {
      ok: false,
      error: "Tu plan actual no es elegible para la prueba Pro.",
    };
  }

  return {
    ok: false,
    error: "Necesitas una tienda para activar la prueba Pro.",
  };
}
