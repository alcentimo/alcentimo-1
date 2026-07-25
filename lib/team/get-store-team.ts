import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Store } from "@/lib/database.types";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { getStoreOwnerPlanProfile } from "@/lib/plans/product-limit";
import {
  getEffectivePlanIdForLimits,
  resolveProTrialStatus,
} from "@/lib/plans/trial";
import { resolvePlanId } from "@/src/config/plans";
import {
  isStoreTeamAdmin,
  isStoreTeamOwner,
} from "@/lib/team/access";
import { resolveTeamLimit } from "@/lib/team/limits";
import type {
  StoreInvitationRow,
  StoreTeamSnapshot,
  TeamMemberRow,
} from "@/lib/team/types";

async function resolveAuthEmails(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const admin = createAdminClient();
  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const { data } = await admin.auth.admin.getUserById(userId);
        const email = data.user?.email?.trim().toLowerCase();
        if (email) map.set(userId, email);
      } catch {
        // Ignorar usuarios no resolubles.
      }
    }),
  );
  return map;
}

function mapMemberRow(
  row: {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
    invited_at?: string | null;
    accepted_at?: string | null;
  },
  ownerId: string,
  emails: Map<string, string>,
): TeamMemberRow {
  const isOwner = row.user_id === ownerId || row.role === "owner";
  return {
    id: row.id,
    user_id: row.user_id,
    role: isOwner ? "owner" : (row.role as TeamMemberRow["role"]),
    created_at: row.created_at,
    invited_at: row.invited_at ?? null,
    accepted_at: row.accepted_at ?? null,
    is_owner: isOwner,
    email: emails.get(row.user_id) ?? null,
    display_name: null,
  };
}

export async function getStoreTeamSnapshot(options: {
  store: Store;
  currentUserId: string;
}): Promise<StoreTeamSnapshot> {
  noStore();
  const supabase = await createClient();
  const { store, currentUserId } = options;

  const [membersResult, invitationsResult, canManage, isOwner, planSettings, ownerProfile] =
    await Promise.all([
      supabase
        .from("store_members")
        .select("id, user_id, role, created_at, invited_at, accepted_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("store_invitations")
        .select("id, email, role, expires_at, created_at, invited_by")
        .eq("store_id", store.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
      isStoreTeamAdmin(supabase, store, currentUserId),
      isStoreTeamOwner(supabase, store, currentUserId),
      fetchPlanSettings().catch(() => null),
      getStoreOwnerPlanProfile(store.id),
    ]);

  if (membersResult.error) throw new Error(membersResult.error.message);

  let invitationRows: NonNullable<typeof invitationsResult.data> = [];
  if (invitationsResult.error) {
    // Fallback si la migración 074 aún no está aplicada.
    if (
      invitationsResult.error.message.includes("store_invitations") ||
      invitationsResult.error.code === "42P01"
    ) {
      invitationRows = [];
    } else {
      throw new Error(invitationsResult.error.message);
    }
  } else {
    invitationRows = invitationsResult.data ?? [];
  }

  const memberRows = membersResult.data ?? [];
  const userIds = [
    ...memberRows.map((row) => row.user_id),
    ...invitationRows.map((row) => row.invited_by),
  ];
  const emails = await resolveAuthEmails(userIds);

  const members = memberRows.map((row) =>
    mapMemberRow(row, store.owner_id, emails),
  );

  const invitations: StoreInvitationRow[] = invitationRows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as StoreInvitationRow["role"],
    expires_at: row.expires_at,
    created_at: row.created_at,
    invited_by: row.invited_by,
    invited_by_email: emails.get(row.invited_by) ?? null,
  }));

  const planId = ownerProfile
    ? resolvePlanId(ownerProfile.plan)
    : resolvePlanId("free");
  const trial = resolveProTrialStatus(ownerProfile, planId);
  const effectivePlanId = getEffectivePlanIdForLimits(planId, trial);
  const limit = resolveTeamLimit({
    planId: effectivePlanId,
    memberCount: members.length,
    pendingInviteCount: invitations.length,
    settings: planSettings ?? undefined,
  });

  return {
    members,
    invitations,
    limit,
    canManage,
    currentUserId,
    isOwner,
  };
}

export async function countPendingStoreInvitations(storeId: string): Promise<number> {
  noStore();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("store_invitations")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    if (error.message.includes("store_invitations") || error.code === "42P01") {
      return 0;
    }
    throw new Error(error.message);
  }
  return count ?? 0;
}
