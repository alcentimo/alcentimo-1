import type { StoreInvitationRow, TeamMemberRow } from "@/lib/team/types";

export type TeamMemberStatus = "active";

export type InvitationStatus = "pending" | "expired" | "revoked";

export const TEAM_MEMBER_STATUS_LABELS: Record<TeamMemberStatus, string> = {
  active: "Activo",
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Invitación pendiente",
  expired: "Expirada",
  revoked: "Revocada",
};

export function resolveTeamMemberStatus(_member: TeamMemberRow): TeamMemberStatus {
  return "active";
}

export function resolveInvitationStatus(
  invitation: {
    expires_at: string;
    accepted_at?: string | null;
    revoked_at?: string | null;
  },
  now = Date.now(),
): InvitationStatus {
  if (invitation.accepted_at) return "revoked";
  if (invitation.revoked_at) return "revoked";
  if (new Date(invitation.expires_at).getTime() <= now) return "expired";
  return "pending";
}
