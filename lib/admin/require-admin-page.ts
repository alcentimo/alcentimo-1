import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { ADMIN_OWN_STORE_NAV_PREFIX } from "@/src/config/dashboard-nav";

export async function requireAdminPageUser(nextPath = "/admin/dashboard") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/dashboard/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isSupportAdmin(resolveAuthEmail(user))) {
    redirect("/dashboard/catalogo?admin_denied=not_listed");
  }

  return user;
}

export async function requireAdminOwnStoreUser() {
  return requireAdminPageUser(`${ADMIN_OWN_STORE_NAV_PREFIX}/catalogo`);
}
