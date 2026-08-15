import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import {
  resolvePostAuthPath,
  resolvePostAuthPathForUser,
} from "@/lib/auth/post-auth-redirect";
import { sanitizeAuthReturnUrl } from "@/lib/auth/validate-auth-return-url";
import { resolveCustomerNextDestination } from "@/lib/customers/middleware-access";
import { ensureCustomerProfileAfterAuth } from "@/lib/customers/ensure-customer-profile";
import { isValidCustomerPhone } from "@/lib/customers/phone-auth";
import { linkGuestOrdersToCustomer } from "@/lib/orders/link-guest-orders";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { checkSupplierAccess } from "@/lib/supplier/access";
import { resolveAuthEmail } from "@/lib/support/admin-access";

function resolveAuthRedirectTarget(
  next: string,
  siteUrl: string,
  storeSlug?: string | null,
): string {
  if (next.startsWith("http://") || next.startsWith("https://")) {
    return sanitizeAuthReturnUrl(next, storeSlug, "/onboarding");
  }

  const normalizedStoreSlug = storeSlug?.trim().toLowerCase();
  if (normalizedStoreSlug) {
    return resolveCustomerNextDestination(normalizedStoreSlug, next);
  }

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  return `${siteUrl}${safeNext}`;
}

export async function finalizeAuthSessionRedirect(
  supabase: SupabaseServerClient,
  input: {
    nextPath?: string | null;
    storeSlug?: string | null;
    orderId?: string | null;
  },
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No se pudo verificar la sesión.");
  }

  try {
    await ensureUserProfile(supabase);
  } catch {
    // El trigger suele crear el perfil; no bloquear el login.
  }

  const siteUrl = getSiteUrl();
  const normalizedStoreSlug = input.storeSlug?.trim().toLowerCase() || null;
  const isSupplier = checkSupplierAccess(resolveAuthEmail(user)).ok;
  const resolvedNext = normalizedStoreSlug
    ? resolvePostAuthPath(input.nextPath)
    : resolvePostAuthPathForUser({
        next: input.nextPath,
        isSupplier,
      });
  const safeNext = resolveAuthRedirectTarget(
    resolvedNext,
    siteUrl,
    normalizedStoreSlug,
  );

  // Teléfono/WhatsApp es opcional: vincula el perfil aunque no haya número.
  try {
    await ensureCustomerProfileAfterAuth(
      supabase,
      user,
      safeNext,
      normalizedStoreSlug ?? input.storeSlug,
    );
  } catch {
    // No bloquear login si falla el vínculo cliente.
  }

  if (normalizedStoreSlug) {
    const metadataPhone =
      typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : "";

    if (isValidCustomerPhone(metadataPhone) && input.orderId?.trim()) {
      try {
        await linkGuestOrdersToCustomer({
          storeSlug: normalizedStoreSlug,
          userId: user.id,
          phone: metadataPhone,
          orderId: input.orderId.trim(),
        });
      } catch {
        // No bloquear login si falla el vínculo de pedidos.
      }
    }
  }

  return safeNext;
}
