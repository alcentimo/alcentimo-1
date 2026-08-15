"use server";

import { createClient } from "@/lib/supabase/server";
import {
  resolvePostAuthPath,
  resolvePostAuthPathForUser,
} from "@/lib/auth/post-auth-redirect";
import { checkSupplierAccess } from "@/lib/supplier/access";
import { resolveAuthEmail } from "@/lib/support/admin-access";

/**
 * Destino post-auth con sesión ya establecida (login, signup, OAuth).
 * Los proveedores/mayoristas van a /proveedor/dashboard por defecto.
 */
export async function resolveAuthenticatedPostAuthPath(
  next?: string | null,
): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return resolvePostAuthPath(next);

    return resolvePostAuthPathForUser({
      next,
      isSupplier: checkSupplierAccess(resolveAuthEmail(user)).ok,
    });
  } catch {
    return resolvePostAuthPath(next);
  }
}
