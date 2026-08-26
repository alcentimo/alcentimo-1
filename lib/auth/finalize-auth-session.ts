import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { ensureDefaultMerchantStore } from "@/lib/stores/ensure-default-merchant-store";
import { loadPostAuthAccountFacts } from "@/lib/auth/post-auth-account-facts";
import {
  isInvitationNextPath,
  pickPostLoginPath,
} from "@/lib/auth/post-auth-redirect";
import { sanitizeAuthReturnUrl } from "@/lib/auth/validate-auth-return-url";
import { resolveCustomerNextDestination } from "@/lib/customers/middleware-access";
import { ensureCustomerProfileAfterAuth } from "@/lib/customers/ensure-customer-profile";
import { isValidCustomerPhone } from "@/lib/customers/phone-auth";
import { linkGuestOrdersToCustomer } from "@/lib/orders/link-guest-orders";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { resolveAuthEmail } from "@/lib/support/admin-access";

function resolveAuthRedirectTarget(
  next: string,
  siteUrl: string,
  storeSlug?: string | null,
): string {
  if (next.startsWith("http://") || next.startsWith("https://")) {
    return sanitizeAuthReturnUrl(next, storeSlug, "/dashboard");
  }

  const normalizedStoreSlug = storeSlug?.trim().toLowerCase();
  if (normalizedStoreSlug) {
    return resolveCustomerNextDestination(normalizedStoreSlug, next);
  }

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
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
  const nextPath = input.nextPath?.trim() || null;
  const wantsSupplierHub = Boolean(nextPath?.startsWith("/proveedor"));
  const loginIntent = normalizedStoreSlug
    ? "customer"
    : wantsSupplierHub
      ? "supplier"
      : "merchant";

  if (
    !normalizedStoreSlug &&
    loginIntent === "merchant" &&
    !isInvitationNextPath(nextPath)
  ) {
    try {
      await ensureDefaultMerchantStore(supabase, user);
    } catch {
      // El panel reintenta crear la tienda si aún no existe.
    }
  }

  const facts = await loadPostAuthAccountFacts({
    userId: user.id,
    email: resolveAuthEmail(user),
    next: nextPath,
    intent: loginIntent,
  });
  const resolvedNext = pickPostLoginPath(facts);
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
