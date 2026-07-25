import type { User } from "@supabase/supabase-js";
import type { DashboardSession } from "@/lib/auth/get-user-profile";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { TEAM_ROLE_LABELS } from "@/lib/team/roles";
import type { AccountSnapshot } from "@/lib/account/types";

function resolveDisplayName(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  const fromDisplay =
    typeof metadata.display_name === "string" ? metadata.display_name.trim() : "";
  if (fromDisplay) return fromDisplay;
  const fromFull =
    typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (fromFull) return fromFull;
  return null;
}

export function userHasPasswordLogin(user: User): boolean {
  return (
    user.identities?.some((identity) => identity.provider === "email") ?? false
  );
}

export function buildAccountSnapshot(
  user: User,
  session: DashboardSession,
): AccountSnapshot {
  const { authUser, store, storeRole } = session;

  return {
    userId: authUser.id,
    email: user.email ?? authUser.email ?? null,
    displayName: resolveDisplayName(user),
    planName: authUser.plan.name,
    planId: authUser.planId,
    memberSince: authUser.profile?.created_at ?? null,
    hasPasswordLogin: userHasPasswordLogin(user),
    isStoreOwner: store ? isStoreOwner(store, authUser.id) : false,
    storeRole,
    storeName: store?.name ?? null,
  };
}

export function formatAccountStoreRole(
  snapshot: Pick<AccountSnapshot, "storeRole" | "isStoreOwner">,
): string | null {
  if (snapshot.isStoreOwner || snapshot.storeRole === "owner") {
    return TEAM_ROLE_LABELS.owner;
  }
  if (snapshot.storeRole === "admin") return TEAM_ROLE_LABELS.admin;
  if (snapshot.storeRole === "staff") return TEAM_ROLE_LABELS.staff;
  return null;
}
