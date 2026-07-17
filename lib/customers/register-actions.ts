"use server";

import { createClient } from "@/lib/supabase/server";
import { buildCustomerAccountPath } from "@/lib/customers/middleware-access";
import {
  ensureCustomerProfile,
  resolveCustomerStoreSlugFromNext,
} from "@/lib/customers/ensure-customer-profile";

export type LinkCustomerToStoreResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

function sanitizeNextPath(
  nextPath: string | null | undefined,
  storeSlug: string,
): string {
  const fallback = buildCustomerAccountPath(storeSlug);
  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }

  const resolvedSlug = resolveCustomerStoreSlugFromNext(nextPath, storeSlug);
  if (resolvedSlug !== storeSlug) {
    return fallback;
  }

  return nextPath.split("?")[0] ?? fallback;
}

/** Vincula la sesión actual a customer_profiles para la tienda del enlace. */
export async function linkCustomerToStore(input: {
  storeSlug: string;
  nextPath?: string | null;
  displayName?: string | null;
  phone?: string | null;
}): Promise<LinkCustomerToStoreResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  if (!storeSlug) {
    return { ok: false, error: "Enlace de registro inválido: falta la tienda." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Debes iniciar sesión para continuar." };
  }

  const result = await ensureCustomerProfile(supabase, user, storeSlug, {
    displayName: input.displayName,
    phone: input.phone,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    redirectTo: sanitizeNextPath(input.nextPath, result.storeSlug),
  };
}
