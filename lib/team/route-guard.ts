import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import {
  canAccessDashboardPath,
  getDefaultDashboardPathForRole,
  hasMinimumStoreRole,
  type DashboardStoreRole,
} from "@/lib/team/permissions";

export async function requireDashboardRouteAccess(
  pathname: string,
  options?: {
    minimumRole?: DashboardStoreRole;
  },
): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getDashboardSession>>>;
  storeRole: DashboardStoreRole;
}> {
  const session = await getDashboardSession();
  if (!session) {
    redirect(`/dashboard/login?next=${encodeURIComponent(pathname)}`);
  }

  const storeRole = session.storeRole;
  if (!session.store) {
    redirect("/onboarding");
  }

  if (!storeRole || !canAccessDashboardPath(storeRole, pathname)) {
    const fallback = getDefaultDashboardPathForRole(storeRole);
    redirect(`${fallback}?access_denied=1`);
  }

  if (options?.minimumRole && !hasMinimumStoreRole(storeRole, options.minimumRole)) {
    redirect(`${getDefaultDashboardPathForRole(storeRole)}?access_denied=1`);
  }

  return { session, storeRole };
}
