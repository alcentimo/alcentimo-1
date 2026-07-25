"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { getSiteUrl } from "@/lib/site-url";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { getStoreOwnerPlanProfile } from "@/lib/plans/product-limit";
import {
  getEffectivePlanIdForLimits,
  resolveProTrialStatus,
} from "@/lib/plans/trial";
import { resolvePlanId, DASHBOARD_PLANS_HREF } from "@/src/config/plans";
import {
  generateInvitationToken,
  getStoreMemberRole,
  hashInvitationToken,
  isStoreTeamOwner,
  requireStoreTeamAdmin,
} from "@/lib/team/access";
import { getStoreTeamSnapshot } from "@/lib/team/get-store-team";
import { resolveTeamLimit } from "@/lib/team/limits";
import {
  isInvitableTeamRole,
  normalizeInviteEmail,
  INVITABLE_ROLE_LABELS,
} from "@/lib/team/roles";
import type {
  InvitationPreview,
  StoreTeamSnapshot,
  TeamLimitSummary,
} from "@/lib/team/types";

const INVITATION_TTL_DAYS = 7;
const TEAM_SETTINGS_PATH = "/dashboard/equipo";

export interface TeamActionResult {
  error?: string;
  team?: StoreTeamSnapshot;
  limit?: TeamLimitSummary;
  inviteUrl?: string;
  emailSent?: boolean;
  emailError?: string;
}

function mapTeamLimit(limit: TeamLimitSummary): TeamLimitSummary {
  return { ...limit };
}

async function resolveStoreTeamLimitForStore(
  storeId: string,
  memberCount: number,
  pendingInviteCount: number,
) {
  const settings = await fetchPlanSettings();
  const owner = await getStoreOwnerPlanProfile(storeId);
  const planId = owner ? resolvePlanId(owner.plan) : resolvePlanId("free");
  const trial = resolveProTrialStatus(owner, planId);
  const effectivePlanId = getEffectivePlanIdForLimits(planId, trial);
  return resolveTeamLimit({
    planId: effectivePlanId,
    memberCount,
    pendingInviteCount,
    settings,
  });
}

function teamLimitError(limit: TeamLimitSummary): string | null {
  if (!limit.canManageTeam) {
    return `El equipo multiusuario está disponible en Plan Business o Enterprise. Mejora tu plan en ${DASHBOARD_PLANS_HREF}.`;
  }
  if (!limit.canInviteMore) {
    if (limit.isUnlimited) {
      return "Alcanzaste el límite técnico de usuarios para esta tienda.";
    }
    return `Alcanzaste el límite de ${limit.maxAllowed} usuarios de tu plan.`;
  }
  return null;
}

export async function getStoreTeamAction(): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  try {
    const team = await getStoreTeamSnapshot({
      store: auth.store,
      currentUserId: auth.authUser.id,
    });
    return { team, limit: mapTeamLimit(team.limit) };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el equipo.",
    };
  }
}

export async function inviteStoreTeamMemberAction(input: {
  email: string;
  role: string;
}): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const adminCheck = await requireStoreTeamAdmin(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!adminCheck.ok) return { error: adminCheck.error };

  const email = normalizeInviteEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Ingresa un correo válido." };
  }
  if (!isInvitableTeamRole(input.role)) {
    return { error: "Rol de invitación inválido." };
  }

  try {
    const team = await getStoreTeamSnapshot({
      store: auth.store,
      currentUserId: auth.authUser.id,
    });
    const limitError = teamLimitError(team.limit);
    if (limitError) {
      return { error: limitError, limit: mapTeamLimit(team.limit) };
    }

    const duplicateMember = team.members.some(
      (member) => member.email?.toLowerCase() === email,
    );
    if (duplicateMember) {
      return { error: "Ese correo ya pertenece al equipo." };
    }

    const duplicateInvite = team.invitations.some(
      (invite) => invite.email.toLowerCase() === email,
    );
    if (duplicateInvite) {
      return { error: "Ya hay una invitación pendiente para ese correo." };
    }

    if (email === auth.authUser.email?.trim().toLowerCase()) {
      return { error: "No puedes invitarte a ti mismo." };
    }

    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const { error: insertError } = await supabase.from("store_invitations").insert({
      store_id: auth.store.id,
      email,
      role: input.role,
      token_hash: tokenHash,
      invited_by: auth.authUser.id,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return { error: "Ya hay una invitación pendiente para ese correo." };
      }
      return { error: insertError.message };
    }

    const inviteUrl = `${getSiteUrl().replace(/\/$/, "")}/dashboard/invitacion?token=${encodeURIComponent(token)}`;

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const { sendTeamInvitationEmail } = await import(
        "@/lib/email/send-team-invitation-email"
      );
      const emailResult = await sendTeamInvitationEmail({
        to: email,
        storeName: auth.store.name,
        roleLabel: INVITABLE_ROLE_LABELS[input.role],
        inviteUrl,
        inviterEmail: auth.authUser.email,
        expiresInDays: INVITATION_TTL_DAYS,
      });
      emailSent = emailResult.ok;
      if (!emailResult.ok) {
        emailError = emailResult.error;
      }
    } catch (emailFailure) {
      console.error("[inviteStoreTeamMemberAction] email", emailFailure);
      emailError =
        emailFailure instanceof Error
          ? emailFailure.message
          : "No se pudo enviar el correo de invitación.";
    }

    let refreshedTeam: StoreTeamSnapshot | undefined;
    let refreshedLimit: TeamLimitSummary | undefined;
    try {
      refreshedTeam = await getStoreTeamSnapshot({
        store: auth.store,
        currentUserId: auth.authUser.id,
      });
      refreshedLimit = mapTeamLimit(refreshedTeam.limit);
    } catch (refreshFailure) {
      console.error("[inviteStoreTeamMemberAction] refresh", refreshFailure);
    }

    try {
      revalidatePath(TEAM_SETTINGS_PATH);
    } catch {
      // La invalidación de caché no debe bloquear la respuesta de la invitación.
    }

    return {
      team: refreshedTeam,
      limit: refreshedLimit,
      inviteUrl,
      emailSent,
      emailError,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "No se pudo crear la invitación.",
    };
  }
}

export async function revokeStoreInvitationAction(
  invitationId: string,
): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const adminCheck = await requireStoreTeamAdmin(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!adminCheck.ok) return { error: adminCheck.error };

  const { error } = await supabase
    .from("store_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("store_id", auth.store.id)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (error) return { error: error.message };

  const team = await getStoreTeamSnapshot({
    store: auth.store,
    currentUserId: auth.authUser.id,
  });
  revalidatePath(TEAM_SETTINGS_PATH);
  return { team, limit: mapTeamLimit(team.limit) };
}

export async function updateStoreMemberRoleAction(input: {
  memberId: string;
  role: string;
}): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const owner = await isStoreTeamOwner(supabase, auth.store, auth.authUser.id);
  if (!owner) {
    return { error: "Solo el dueño puede cambiar roles del equipo." };
  }
  if (!isInvitableTeamRole(input.role)) {
    return { error: "Rol inválido." };
  }

  const { data: member, error: memberError } = await supabase
    .from("store_members")
    .select("id, user_id, role")
    .eq("id", input.memberId)
    .eq("store_id", auth.store.id)
    .maybeSingle();

  if (memberError) return { error: memberError.message };
  if (!member) return { error: "Miembro no encontrado." };
  if (member.user_id === auth.store.owner_id || member.role === "owner") {
    return { error: "No puedes cambiar el rol del dueño." };
  }

  const { error } = await supabase
    .from("store_members")
    .update({ role: input.role })
    .eq("id", input.memberId)
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  const team = await getStoreTeamSnapshot({
    store: auth.store,
    currentUserId: auth.authUser.id,
  });
  revalidatePath(TEAM_SETTINGS_PATH);
  return { team, limit: mapTeamLimit(team.limit) };
}

export async function removeStoreMemberAction(
  memberId: string,
): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const adminCheck = await requireStoreTeamAdmin(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!adminCheck.ok) return { error: adminCheck.error };

  const { data: member, error: memberError } = await supabase
    .from("store_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("store_id", auth.store.id)
    .maybeSingle();

  if (memberError) return { error: memberError.message };
  if (!member) return { error: "Miembro no encontrado." };
  if (member.user_id === auth.store.owner_id || member.role === "owner") {
    return { error: "No puedes eliminar al dueño de la tienda." };
  }

  const actorRole = await getStoreMemberRole(
    supabase,
    auth.store.id,
    auth.authUser.id,
  );
  if (actorRole === "admin" && member.role === "admin") {
    return { error: "Solo el dueño puede eliminar a otro encargado." };
  }

  const { error } = await supabase
    .from("store_members")
    .delete()
    .eq("id", memberId)
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  const team = await getStoreTeamSnapshot({
    store: auth.store,
    currentUserId: auth.authUser.id,
  });
  revalidatePath(TEAM_SETTINGS_PATH);
  return { team, limit: mapTeamLimit(team.limit) };
}

export async function previewStoreInvitationAction(
  token: string,
): Promise<{ preview?: InvitationPreview; error?: string }> {
  const supabase = await createClient();
  const trimmed = token.trim();
  if (!trimmed) return { error: "Invitación inválida." };

  const { data, error } = await supabase.rpc("preview_store_invitation", {
    p_token: trimmed,
  });

  if (error) {
    if (error.message.includes("preview_store_invitation")) {
      return { error: "El sistema de invitaciones aún no está disponible." };
    }
    return { error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "Invitación no encontrada." };

  return {
    preview: {
      invitationId: row.invitation_id,
      storeId: row.store_id,
      storeName: row.store_name,
      storeSlug: row.store_slug,
      email: row.email,
      role: row.role,
      expiresAt: row.expires_at,
      isExpired: row.is_expired,
      isRevoked: row.is_revoked,
      isAccepted: row.is_accepted,
    },
  };
}

export async function acceptStoreInvitationAction(
  token: string,
): Promise<{ error?: string; storeSlug?: string; role?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Debes iniciar sesión." };
  }

  const trimmed = token.trim();
  if (!trimmed) return { error: "Invitación inválida." };

  const previewResult = await previewStoreInvitationAction(trimmed);
  if (previewResult.error || !previewResult.preview) {
    return { error: previewResult.error ?? "Invitación no encontrada." };
  }

  const preview = previewResult.preview;
  if (preview.isRevoked) return { error: "Esta invitación fue revocada." };
  if (preview.isAccepted) return { error: "Esta invitación ya fue aceptada." };
  if (preview.isExpired) return { error: "Esta invitación expiró." };

  const userEmail = user.email?.trim().toLowerCase();
  if (!userEmail) {
    return { error: "Tu cuenta no tiene correo verificado." };
  }
  if (userEmail !== preview.email.trim().toLowerCase()) {
    return {
      error: `Esta invitación fue enviada a ${preview.email}. Inicia sesión con ese correo.`,
    };
  }

  const { count: memberCount } = await supabase
    .from("store_members")
    .select("id", { count: "exact", head: true })
    .eq("store_id", preview.storeId);

  const { count: pendingCount } = await supabase
    .from("store_invitations")
    .select("id", { count: "exact", head: true })
    .eq("store_id", preview.storeId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  const limit = await resolveStoreTeamLimitForStore(
    preview.storeId,
    memberCount ?? 0,
    pendingCount ?? 0,
  );

  const { data: existingMember } = await supabase
    .from("store_members")
    .select("id")
    .eq("store_id", preview.storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember && !limit.canInviteMore && limit.canManageTeam) {
    return { error: "Esta tienda alcanzó el límite de usuarios de su plan." };
  }

  const { error } = await supabase.rpc("accept_store_invitation", {
    p_token: trimmed,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(TEAM_SETTINGS_PATH);
  return { storeSlug: preview.storeSlug, role: preview.role };
}
