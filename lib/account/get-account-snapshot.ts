import type { DashboardSession } from "@/lib/auth/get-user-profile";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { TEAM_ROLE_LABELS } from "@/lib/team/roles";
import type { AccountSnapshot } from "@/lib/account/types";

export function buildAccountSnapshot(
  session: DashboardSession,
): AccountSnapshot {
  const { authUser, store, storeRole } = session;

  return {
    userId: authUser.id,
    email: authUser.email ?? null,
    displayName: authUser.displayName,
    planName: authUser.plan.name,
    planId: authUser.planId,
    memberSince: authUser.profile?.created_at ?? null,
    hasPasswordLogin: authUser.hasPasswordLogin,
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
