"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { getStoreProductCount } from "@/lib/plans/product-limit";
import {
  isProTrialClaimCodeValid,
  isProTrialUnlockReady,
  PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
} from "@/lib/plans/trial-unlock";

export type StartProTrialResult =
  | { ok: true; endsAt: string }
  | { ok: false; error: string };

export async function startProTrial(
  claimCode: string,
): Promise<StartProTrialResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (!isProTrialClaimCodeValid(claimCode)) {
    return {
      ok: false,
      error: "Escribe ALCENTIMO para reclamar tu premio.",
    };
  }

  const store = await getUserStore(supabase, auth.authUser.id);
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
