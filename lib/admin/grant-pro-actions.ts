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

/**
 * Cierra la prueba/prórroga/revisión y aplica Plan Gratis.
 * Única vía de “downgrade” post-prueba: decisión manual del admin.
 */
export async function closeProTrialToFreePlan(input: {
  userId: string;
  note?: string;
}): Promise<GrantProResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const userId = input.userId.trim();
  if (!userId) return { error: "Usuario no válido." };

  const admin = createAdminClient();
  const closedIso = new Date().toISOString();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, pro_trial_started_at, pro_trial_closed_at, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Usuario no encontrado." };

  const subscriptionStatus = profile.subscription_status ?? "none";
  if (subscriptionStatus === "active" || subscriptionStatus === "provisional") {
    return {
      error:
        "Este usuario tiene suscripción de pago. Revoca el pago o cambia el plan desde pagos, no desde la prueba.",
    };
  }

  if (!profile.pro_trial_started_at) {
    // Sin prueba: igual forzar FREE limpio.
    const { error: freeError } = await admin
      .from("profiles")
      .update({
        plan: "FREE",
        subscription_status: "none",
        billing_period: null,
        subscription_period_started_at: null,
        subscription_period_ends_at: null,
      })
      .eq("id", userId);
    if (freeError) return { error: freeError.message };
  } else {
    const { error: closeError } = await admin
      .from("profiles")
      .update({
        plan: "FREE",
        subscription_status: "none",
        pro_trial_closed_at: closedIso,
        billing_period: null,
        subscription_period_started_at: null,
        subscription_period_ends_at: null,
      })
      .eq("id", userId);
    if (closeError) return { error: closeError.message };
  }

  await logGrowthAction({
    actorId: auth.user.id,
    action: "close_pro_trial",
    targetUserId: userId,
    summary: "Pasó la cuenta a Plan Gratis (cierre manual de prueba)",
    meta: {
      note: input.note?.trim() || "Cierre manual admin → Plan Gratis",
      closed_at: closedIso,
    },
  });

  revalidateGrowthPaths();
  return { success: true, granted: 1 };
}

export async function closeProTrialToFreePlanForUsers(input: {
  userIds: string[];
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

  let granted = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await closeProTrialToFreePlan({
      userId,
      note:
        input.note ??
        `Cierre masivo a Plan Gratis (${userIds.length} usuarios)`,
    });
    // closeProTrialToFreePlan re-checks admin each time — ok but wasteful.
    // For mass, call internal logic... keeping simple for now.
    if (result.error) failed += 1;
    else granted += 1;
  }

  revalidateGrowthPaths();

  if (granted === 0) {
    return { error: "No se pudo pasar a Plan Gratis a ningún usuario." };
  }

  return { success: true, granted, failed };
}

async function grantOrExtendProTrialToSingleUser(input: {
  adminUserId: string;
  userId: string;
  days: number;
  note?: string;
}): Promise<{ error?: string; endsAt?: string }> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, plan, subscription_status, pro_trial_started_at, pro_trial_ends_at",
    )
    .eq("id", input.userId)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Usuario no encontrado." };

  const subscriptionStatus = profile.subscription_status ?? "none";
  const isPaid =
    subscriptionStatus === "active" || subscriptionStatus === "provisional";

  // Si ya tiene Pro de pago, extender suscripción (también sin anti-abuso).
  if (isPaid) {
    const paid = await grantProToSingleUser({
      adminUserId: input.adminUserId,
      userId: input.userId,
      days: input.days,
      note: input.note ?? "Extensión admin (usuario con suscripción)",
    });
    if (paid.error) return { error: paid.error };
    return {};
  }

  const now = Date.now();
  const existingEndsMs = profile.pro_trial_ends_at
    ? new Date(profile.pro_trial_ends_at).getTime()
    : null;
  const baseMs =
    existingEndsMs != null && Number.isFinite(existingEndsMs) && existingEndsMs > now
      ? existingEndsMs
      : now;
  const endsAt = new Date(baseMs);
  endsAt.setUTCDate(endsAt.getUTCDate() + input.days);
  const endsIso = endsAt.toISOString();
  const startedIso =
    profile.pro_trial_started_at ?? new Date(now).toISOString();

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      plan: "FREE",
      subscription_status: "none",
      pro_trial_started_at: startedIso,
      pro_trial_ends_at: endsIso,
      pro_trial_closed_at: null,
      billing_period: null,
      subscription_period_started_at: null,
      subscription_period_ends_at: null,
    })
    .eq("id", input.userId);

  if (updateError) return { error: updateError.message };

  // Marca la tienda como reclamada (flag permanente), pero NO registra
  // email/teléfono en pro_trial_contact_claims: el admin puede reactivar
  // aunque el contacto ya se haya usado en otra tienda.
  const { data: store } = await admin
    .from("stores")
    .select("id, pro_trial_claimed_at")
    .eq("owner_id", input.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (store && !store.pro_trial_claimed_at) {
    await admin
      .from("stores")
      .update({ pro_trial_claimed_at: startedIso })
      .eq("id", store.id)
      .is("pro_trial_claimed_at", null);
  }

  await logGrowthAction({
    actorId: input.adminUserId,
    action: "grant_pro_trial",
    targetUserId: input.userId,
    summary: `Activó/extendió prueba Pro por ${input.days} días (bypass anti-abuso)`,
    meta: {
      days: input.days,
      ends_at: endsIso,
      note: input.note?.trim() || "Prueba Pro manual (admin)",
      bypass_contact_guards: true,
    },
  });

  return { endsAt: endsIso };
}

/** Activa o extiende la prueba Pro gratuita (admin). Ignora anti-abuso de contacto. */
export async function grantOrExtendProTrialToUser(input: {
  userId: string;
  days?: number;
  note?: string;
}): Promise<GrantProResult & { endsAt?: string }> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const userId = input.userId.trim();
  if (!userId) return { error: "Usuario no válido." };

  const days = Math.min(Math.max(input.days ?? 30, 1), 365);
  const result = await grantOrExtendProTrialToSingleUser({
    adminUserId: auth.user.id,
    userId,
    days,
    note: input.note,
  });

  if (result.error) return { error: result.error };

  revalidateGrowthPaths();
  return { success: true, granted: 1, endsAt: result.endsAt };
}

/** Activa/extiende prueba Pro a varios usuarios (admin, sin anti-abuso). */
export async function grantOrExtendProTrialToUsers(input: {
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
    const result = await grantOrExtendProTrialToSingleUser({
      adminUserId: auth.user.id,
      userId,
      days,
      note:
        input.note ??
        `Prueba Pro masiva admin (${userIds.length} usuarios)`,
    });
    if (result.error) failed += 1;
    else granted += 1;
  }

  revalidateGrowthPaths();

  if (granted === 0) {
    return {
      error: "No se pudo activar/extender la prueba Pro a ningún usuario.",
    };
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
