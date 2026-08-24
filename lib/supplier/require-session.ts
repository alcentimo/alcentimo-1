import { createClient } from "@/lib/supabase/server";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";

export async function requireSupplierHubUser(): Promise<{
  error?: string;
  user?: { id: string };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión." };
  }

  const email = resolveSupplierAuthEmail(user);
  const access = await resolveSupplierAccess({
    email,
    userId: user.id,
    user,
  });
  if (!access.ok) {
    return { error: "No tienes acceso al panel de proveedores." };
  }

  return { user: { id: user.id } };
}
