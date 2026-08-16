"use server";

import {
  resolvePostAuthPath,
  SUPPLIER_POST_AUTH_PATH,
} from "@/lib/auth/post-auth-redirect";
import { shouldForceSupplierPostAuthRedirect } from "@/lib/supplier/access";

export type PostAuthIdentity = {
  userId: string;
  email?: string | null;
};

/**
 * Destino post-auth sin tocar cookies de Supabase (evita
 * "Unexpected response was received from the server" en Server Actions).
 *
 * Login de tienda/cliente: panel dropshipping, salvo que `next` pida
 * explícitamente /proveedor y el usuario sea proveedor real.
 */
export async function resolveAuthenticatedPostAuthPath(
  next?: string | null,
  identity?: PostAuthIdentity | null,
): Promise<string> {
  try {
    const nextPath = next?.trim() || null;
    const wantsSupplierHub = Boolean(nextPath?.startsWith("/proveedor"));

    if (wantsSupplierHub && identity?.userId) {
      const isSupplier = await shouldForceSupplierPostAuthRedirect({
        email: identity.email ?? null,
        userId: identity.userId,
      });
      if (isSupplier) return SUPPLIER_POST_AUTH_PATH;
    }

    // Login de tienda/cliente: nunca redirigir al hub de proveedores.
    return resolvePostAuthPath(nextPath);
  } catch {
    return resolvePostAuthPath(next);
  }
}
