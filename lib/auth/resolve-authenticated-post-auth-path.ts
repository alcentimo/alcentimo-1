"use server";

import { createClient } from "@/lib/supabase/server";
import {
  resolvePostAuthPath,
  resolvePostAuthPathForUser,
  SUPPLIER_POST_AUTH_PATH,
} from "@/lib/auth/post-auth-redirect";
import { resolveSupplierAccess } from "@/lib/supplier/access";
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

    const isSupplier = (
      await resolveSupplierAccess({
        email: resolveAuthEmail(user),
        userId: user.id,
        user,
      })
    ).ok;

    // Mayoristas: destino estricto al hub de proveedores.
    if (isSupplier) {
      return SUPPLIER_POST_AUTH_PATH;
    }

    return resolvePostAuthPathForUser({
      next,
      isSupplier: false,
    });
  } catch {
    return resolvePostAuthPath(next);
  }
}
