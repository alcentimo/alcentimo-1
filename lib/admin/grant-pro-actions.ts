"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { buildPaidProfilePatch } from "@/lib/plans/plan-activation";

export type GrantProResult = { error?: string; success?: boolean };

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso de administrador." };
  }
  return { ok: true as const, user };
}

function revalidateGrowthPaths() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/upgrade");
}

/** Otorga PRO activo por N días sin pasar por pagos. */
export async function grantProMonthToUser(input: {
  userId: string;
  days?: number;
  note?: string;
}): Promise<GrantProResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const userId = input.userId.trim();
  if (!userId) return { error: "Usuario no válido." };

  const days = Math.min(Math.max(input.days ?? 30, 1), 365);
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime());
  endsAt.setUTCDate(endsAt.getUTCDate() + days);

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Usuario no encontrado." };

  const { error: updateError } = await admin
    .from("profiles")
    .update(
      buildPaidProfilePatch("PRO", "active", {
        billingPeriod: "monthly",
        periodStartedAt: startedAt,
        periodEndsAt: endsAt,
      }),
    )
    .eq("id", userId);

  if (updateError) return { error: updateError.message };

  const { error: grantError } = await admin.from("admin_plan_grants").insert({
    user_id: userId,
    granted_by: auth.user.id,
    plan: "PRO",
    days,
    note: input.note?.trim() || "Otorgar mes Pro (manual)",
  });

  if (grantError) return { error: grantError.message };

  revalidateGrowthPaths();
  return { success: true };
}

export async function sendPromoOffersToUsers(input: {
  userIds: string[];
  title: string;
  message: string;
  couponId?: string | null;
}): Promise<GrantProResult & { sent?: number }> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const userIds = Array.from(new Set(input.userIds.map((id) => id.trim()).filter(Boolean)));
  if (userIds.length === 0) {
    return { error: "Selecciona al menos un usuario." };
  }

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) {
    return { error: "Título y mensaje son obligatorios." };
  }

  const admin = createAdminClient();
  const rows = userIds.map((userId) => ({
    user_id: userId,
    coupon_id: input.couponId || null,
    campaign_id: null,
    title: title.slice(0, 120),
    message: message.slice(0, 1000),
    created_by: auth.user.id,
  }));

  const { error } = await admin.from("user_promo_offers").insert(rows);
  if (error) return { error: error.message };

  revalidateGrowthPaths();
  return { success: true, sent: rows.length };
}
