"use server";

import { createClient } from "@/lib/supabase/server";
import {
  resolvePostAuthPath,
  SUPPLIER_POST_AUTH_PATH,
} from "@/lib/auth/post-auth-redirect";
import { shouldForceSupplierPostAuthRedirect } from "@/lib/supplier/access";
import { resolveAuthEmail } from "@/lib/support/admin-access";

/**
 * Destino post-auth con sesión ya establecida (login, signup, OAuth).
 *
 * Login de clientes/tiendas (/dashboard/login): panel de dropshipping.
 * Solo fuerza /proveedor/dashboard si `next` apunta al hub mayorista
 * y el usuario es proveedor real (perfil o allowlist).
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

    const nextPath = next?.trim() || null;
    const wantsSupplierHub = Boolean(
      nextPath?.startsWith("/proveedor"),
    );

    if (wantsSupplierHub) {
      const isSupplier = await shouldForceSupplierPostAuthRedirect({
        email: resolveAuthEmail(user),
        userId: user.id,
      });
      if (isSupplier) return SUPPLIER_POST_AUTH_PATH;
    }

    // Login de tienda/cliente: nunca redirigir al hub de proveedores.
    return resolvePostAuthPath(nextPath);
  } catch {
    return resolvePostAuthPath(next);
  }
}
