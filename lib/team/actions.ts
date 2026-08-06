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
import { resolvePlanId } from "@/src/config/plans";
import {
  generateInvitationToken,
  hashInvitationToken,
  isStoreTeamOwner,
  requireStoreTeamOwner,
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

export type TeamActionErrorCode = "PENDING_INVITE_EXISTS";

export interface TeamActionResult {
  error?: string;
  code?: TeamActionErrorCode;
  pendingInvitationId?: string;
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

async function deliverStoreInvitationEmail(options: {
  email: string;
  role: string;
  storeName: string;
  inviterEmail?: string | null;
  token: string;
}): Promise<{ inviteUrl: string; emailSent: boolean; emailError?: string }> {
  const inviteUrl = `${getSiteUrl().replace(/\/$/, "")}/dashboard/invitacion?token=${encodeURIComponent(options.token)}`;

  let emailSent = false;
  let emailError: string | undefined;
  try {
    const { sendTeamInvitationEmail } = await import(
      "@/lib/email/send-team-invitation-email"
    );
    const emailResult = await sendTeamInvitationEmail({
      to: options.email,
      storeName: options.storeName,
      roleLabel: isInvitableTeamRole(options.role)
        ? INVITABLE_ROLE_LABELS[options.role]
        : options.role,
      inviteUrl,
      inviterEmail: options.inviterEmail,
      expiresInDays: INVITATION_TTL_DAYS,
    });
    emailSent = emailResult.ok;
    if (!emailResult.ok) {
      emailError = emailResult.error;
    }
  } catch (emailFailure) {
    console.error("[deliverStoreInvitationEmail]", emailFailure);
    emailError =
      emailFailure instanceof Error
        ? emailFailure.message
        : "No se pudo enviar el correo de invitación.";
  }

  return { inviteUrl, emailSent, emailError };
}

function teamLimitError(limit: TeamLimitSummary): string | null {
  if (!limit.canInviteMore) {
    if (limit.isUnlimited) {
      return "Alcanzaste el límite técnico de usuarios para esta tienda.";
    }
    return `Alcanzaste el límite de ${limit.maxAllowed} usuarios de tu plan.`;
  }
  return null;
}

async function rotateInvitationTokenAndDeliver(options: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  storeId: string;
  invitationId: string;
  email: string;
  role: string;
  storeName: string;
  inviterEmail?: string | null;
  sendEmail: boolean;
  roleUpdate?: string;
}): Promise<TeamActionResult> {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);
  const sentAt = new Date().toISOString();

  const updatePayload: {
    token_hash: string;
    expires_at: string;
    last_sent_at: string;
    role?: string;
  } = {
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    last_sent_at: sentAt,
  };
  if (options.roleUpdate && isInvitableTeamRole(options.roleUpdate)) {
    updatePayload.role = options.roleUpdate;
  }

  const { error: updateError } = await options.supabase
    .from("store_invitations")
    .update(updatePayload)
    .eq("id", options.invitationId)
    .eq("store_id", options.storeId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (updateError) return { error: updateError.message };

  const deliveryRole = options.roleUpdate ?? options.role;
  let inviteUrl = `${getSiteUrl().replace(/\/$/, "")}/dashboard/invitacion?token=${encodeURIComponent(token)}`;
  let emailSent = false;
  let emailError: string | undefined;

  if (options.sendEmail) {
    const delivery = await deliverStoreInvitationEmail({
      email: options.email,
      role: deliveryRole,
      storeName: options.storeName,
      inviterEmail: options.inviterEmail,
      token,
    });
    inviteUrl = delivery.inviteUrl;
    emailSent = delivery.emailSent;
    emailError = delivery.emailError;
  }

  return { inviteUrl, emailSent, emailError };
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
  /** Si ya existe una invitación pendiente, la actualiza (rol + nuevo enlace). */
  updateExisting?: boolean;
}): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const ownerCheck = await requireStoreTeamOwner(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!ownerCheck.ok) return { error: ownerCheck.error };

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

    const duplicateMember = team.members.some(
      (member) => member.email?.toLowerCase() === email,
    );
    if (duplicateMember) {
      return { error: "Ese correo ya pertenece al equipo." };
    }

    if (email === auth.authUser.email?.trim().toLowerCase()) {
      return { error: "No puedes invitarte a ti mismo." };
    }

    const existingPending = team.invitations.find(
      (invite) =>
        invite.status === "pending" && invite.email.toLowerCase() === email,
    );

    if (existingPending && !input.updateExisting) {
      return {
        error: "Ya hay una invitación pendiente para ese correo.",
        code: "PENDING_INVITE_EXISTS",
        pendingInvitationId: existingPending.id,
        team,
        limit: mapTeamLimit(team.limit),
      };
    }

    if (existingPending && input.updateExisting) {
      // Actualizar no consume un cupo nuevo: el slot ya estaba contado.
      const rotated = await rotateInvitationTokenAndDeliver({
        supabase,
        storeId: auth.store.id,
        invitationId: existingPending.id,
        email: existingPending.email,
        role: existingPending.role,
        storeName: auth.store.name,
        inviterEmail: auth.authUser.email,
        sendEmail: true,
        roleUpdate: input.role,
      });
      if (rotated.error) return rotated;

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
        // La invalidación de caché no debe bloquear la respuesta.
      }

      return {
        team: refreshedTeam,
        limit: refreshedLimit,
        inviteUrl: rotated.inviteUrl,
        emailSent: rotated.emailSent,
        emailError: rotated.emailError,
      };
    }

    const limitError = teamLimitError(team.limit);
    if (limitError) {
      return { error: limitError, limit: mapTeamLimit(team.limit) };
    }

    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);
    const sentAt = new Date().toISOString();

    const { error: insertError } = await supabase.from("store_invitations").insert({
      store_id: auth.store.id,
      email,
      role: input.role,
      token_hash: tokenHash,
      invited_by: auth.authUser.id,
      expires_at: expiresAt.toISOString(),
      last_sent_at: sentAt,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          error: "Ya hay una invitación pendiente para ese correo.",
          code: "PENDING_INVITE_EXISTS",
        };
      }
      return { error: insertError.message };
    }

    const delivery = await deliverStoreInvitationEmail({
      email,
      role: input.role,
      storeName: auth.store.name,
      inviterEmail: auth.authUser.email,
      token,
    });

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
      inviteUrl: delivery.inviteUrl,
      emailSent: delivery.emailSent,
      emailError: delivery.emailError,
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

  const ownerCheck = await requireStoreTeamOwner(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!ownerCheck.ok) return { error: ownerCheck.error };

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

export async function resendStoreInvitationAction(
  invitationId: string,
): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const ownerCheck = await requireStoreTeamOwner(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!ownerCheck.ok) return { error: ownerCheck.error };

  const { data: invitation, error: invitationError } = await supabase
    .from("store_invitations")
    .select("id, email, role")
    .eq("id", invitationId)
    .eq("store_id", auth.store.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (invitationError) return { error: invitationError.message };
  if (!invitation) return { error: "Invitación pendiente no encontrada." };

  const rotated = await rotateInvitationTokenAndDeliver({
    supabase,
    storeId: auth.store.id,
    invitationId,
    email: invitation.email,
    role: invitation.role,
    storeName: auth.store.name,
    inviterEmail: auth.authUser.email,
    sendEmail: true,
  });
  if (rotated.error) return rotated;

  let refreshedTeam: StoreTeamSnapshot | undefined;
  let refreshedLimit: TeamLimitSummary | undefined;
  try {
    refreshedTeam = await getStoreTeamSnapshot({
      store: auth.store,
      currentUserId: auth.authUser.id,
    });
    refreshedLimit = mapTeamLimit(refreshedTeam.limit);
  } catch (refreshFailure) {
    console.error("[resendStoreInvitationAction] refresh", refreshFailure);
  }

  revalidatePath(TEAM_SETTINGS_PATH);

  return {
    team: refreshedTeam,
    limit: refreshedLimit,
    inviteUrl: rotated.inviteUrl,
    emailSent: rotated.emailSent,
    emailError: rotated.emailError,
  };
}

/** Regenera el token y devuelve el enlace listo para compartir (sin reenviar correo). */
export async function refreshStoreInvitationLinkAction(
  invitationId: string,
): Promise<TeamActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const ownerCheck = await requireStoreTeamOwner(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!ownerCheck.ok) return { error: ownerCheck.error };

  const { data: invitation, error: invitationError } = await supabase
    .from("store_invitations")
    .select("id, email, role")
    .eq("id", invitationId)
    .eq("store_id", auth.store.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (invitationError) return { error: invitationError.message };
  if (!invitation) return { error: "Invitación pendiente no encontrada." };

  const rotated = await rotateInvitationTokenAndDeliver({
    supabase,
    storeId: auth.store.id,
    invitationId,
    email: invitation.email,
    role: invitation.role,
    storeName: auth.store.name,
    inviterEmail: auth.authUser.email,
    sendEmail: false,
  });
  if (rotated.error) return rotated;

  let refreshedTeam: StoreTeamSnapshot | undefined;
  let refreshedLimit: TeamLimitSummary | undefined;
  try {
    refreshedTeam = await getStoreTeamSnapshot({
      store: auth.store,
      currentUserId: auth.authUser.id,
    });
    refreshedLimit = mapTeamLimit(refreshedTeam.limit);
  } catch (refreshFailure) {
    console.error("[refreshStoreInvitationLinkAction] refresh", refreshFailure);
  }

  revalidatePath(TEAM_SETTINGS_PATH);

  return {
    team: refreshedTeam,
    limit: refreshedLimit,
    inviteUrl: rotated.inviteUrl,
  };
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

  const ownerCheck = await requireStoreTeamOwner(
    supabase,
    auth.store,
    auth.authUser.id,
  );
  if (!ownerCheck.ok) return { error: ownerCheck.error };

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
  if (member.user_id === auth.authUser.id) {
    return { error: "No puedes eliminarte a ti mismo desde aquí." };
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
