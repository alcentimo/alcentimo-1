"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { buildPaidProfilePatch } from "@/lib/plans/plan-activation";
import { logGrowthAction } from "@/lib/admin/growth-audit";

export type GrantProResult = {
  error?: string;
  success?: boolean;
  granted?: number;
  failed?: number;
};

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

async function grantProToSingleUser(input: {
  adminUserId: string;
  userId: string;
  days: number;
  note?: string;
}): Promise<{ error?: string }> {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime());
  endsAt.setUTCDate(endsAt.getUTCDate() + input.days);

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", input.userId)
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
    .eq("id", input.userId);

  if (updateError) return { error: updateError.message };

  const { data: grant, error: grantError } = await admin
    .from("admin_plan_grants")
    .insert({
      user_id: input.userId,
      granted_by: input.adminUserId,
      plan: "PRO",
      days: input.days,
      note: input.note?.trim() || "Otorgar Pro (manual)",
    })
    .select("id")
    .single();

  if (grantError) return { error: grantError.message };

  await logGrowthAction({
    actorId: input.adminUserId,
    action: "grant_pro",
    targetUserId: input.userId,
    summary: `Otorgó plan PRO por ${input.days} días`,
    meta: {
      plan: "PRO",
      days: input.days,
      note: input.note?.trim() || "Otorgar Pro (manual)",
      grant_id: grant?.id,
    },
  });

  return {};
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
  const result = await grantProToSingleUser({
    adminUserId: auth.user.id,
    userId,
    days,
    note: input.note,
  });

  if (result.error) return { error: result.error };

  revalidateGrowthPaths();
  return { success: true, granted: 1 };
}

/** Otorga Pro a varios usuarios seleccionados. */
export async function grantProMonthToUsers(input: {
  userIds: string[];
  days?: number;
  note?: string;
}): Promise<GrantProResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const userIds = Array.from(
    new Set(input.userIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (userIds.length === 0) {
    return { error: "Selecciona al menos un usuario." };
  }

  const days = Math.min(Math.max(input.days ?? 30, 1), 365);
  let granted = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await grantProToSingleUser({
      adminUserId: auth.user.id,
      userId,
      days,
      note: input.note ?? `Otorgar Pro masivo (${userIds.length} usuarios)`,
    });
    if (result.error) failed += 1;
    else granted += 1;
  }

  revalidateGrowthPaths();

  if (granted === 0) {
    return { error: "No se pudo otorgar Pro a ningún usuario seleccionado." };
  }

  return { success: true, granted, failed };
}

export async function sendPromoOffersToUsers(input: {
  userIds: string[];
  title: string;
  message: string;
  couponId?: string | null;
}): Promise<GrantProResult & { sent?: number }> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const userIds = Array.from(
    new Set(input.userIds.map((id) => id.trim()).filter(Boolean)),
  );
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

  await logGrowthAction({
    actorId: auth.user.id,
    action: "send_promo",
    summary: `Envió promoción «${title}» a ${rows.length} usuarios`,
    meta: {
      title,
      user_count: rows.length,
      coupon_id: input.couponId || null,
    },
  });

  revalidateGrowthPaths();
  return { success: true, sent: rows.length };
}
