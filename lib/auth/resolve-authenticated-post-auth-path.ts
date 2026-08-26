"use server";

import {
  pickPostLoginPath,
  resolvePostAuthPath,
  type LoginIntent,
} from "@/lib/auth/post-auth-redirect";
import { loadPostAuthAccountFacts } from "@/lib/auth/post-auth-account-facts";

export type PostAuthIdentity = {
  userId: string;
  email?: string | null;
};

/**
 * Destino post-auth sin tocar cookies de Supabase (evita
 * "Unexpected response was received from the server" en Server Actions).
 *
 * Login de tienda: panel dropshipping. Login de cliente: cuenta de la tienda.
 * Hub mayorista solo si el origen/next es /proveedor y el usuario es proveedor.
 */
export async function resolveAuthenticatedPostAuthPath(
  next?: string | null,
  identity?: PostAuthIdentity | null,
  intent?: LoginIntent | null,
): Promise<string> {
  try {
    const nextPath = next?.trim() || null;
    if (!identity?.userId) {
      return resolvePostAuthPath(nextPath);
    }

    const facts = await loadPostAuthAccountFacts({
      userId: identity.userId,
      email: identity.email ?? null,
      next: nextPath,
      intent: intent ?? "merchant",
    });
    return pickPostLoginPath(facts);
  } catch {
    return resolvePostAuthPath(next);
  }
}
