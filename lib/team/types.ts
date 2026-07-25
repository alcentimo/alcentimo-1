import type { StoreMemberRole } from "@/lib/database.types";

export type InvitableTeamRole = Extract<StoreMemberRole, "admin" | "staff">;

export interface TeamMemberRow {
  id: string;
  user_id: string;
  role: StoreMemberRole;
  created_at: string;
  invited_at: string | null;
  accepted_at: string | null;
  is_owner: boolean;
  email: string | null;
  display_name: string | null;
}

export interface StoreInvitationRow {
  id: string;
  email: string;
  role: InvitableTeamRole;
  expires_at: string;
  created_at: string;
  invited_by: string;
  invited_by_email: string | null;
}

export interface TeamLimitSummary {
  planId: string;
  canManageTeam: boolean;
  maxAllowed: number | null;
  isUnlimited: boolean;
  memberCount: number;
  pendingInviteCount: number;
  usedSlots: number;
  remainingSlots: number;
  canInviteMore: boolean;
}

export interface StoreTeamSnapshot {
  members: TeamMemberRow[];
  invitations: StoreInvitationRow[];
  limit: TeamLimitSummary;
  canManage: boolean;
  currentUserId: string;
  isOwner: boolean;
}

export interface InvitationPreview {
  invitationId: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  email: string;
  role: InvitableTeamRole;
  expiresAt: string;
  isExpired: boolean;
  isRevoked: boolean;
  isAccepted: boolean;
}
