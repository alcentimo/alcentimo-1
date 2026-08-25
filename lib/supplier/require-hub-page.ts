import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";

export async function requireSupplierHubPageUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/proveedor/login");
  }

  const access = await resolveSupplierAccess({
    email: resolveSupplierAuthEmail(user),
    userId: user.id,
    user,
  });
  if (!access.ok) {
    redirect(`/proveedor/registro?error=${access.reason ?? "denied"}`);
  }

  return user;
}
