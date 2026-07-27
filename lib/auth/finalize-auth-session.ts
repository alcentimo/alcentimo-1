import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { sanitizeAuthReturnUrl } from "@/lib/auth/validate-auth-return-url";
import { resolveCustomerNextDestination, buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { ensureCustomerProfileAfterAuth } from "@/lib/customers/ensure-customer-profile";
import { isValidCustomerPhone } from "@/lib/customers/phone-auth";
import { linkGuestOrdersToCustomer } from "@/lib/orders/link-guest-orders";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import {
  getStoreCatalogOrigin,
  isStoreSubdomainCatalogEnabled,
} from "@/lib/store-host";

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
  const safeNext = resolveAuthRedirectTarget(
    resolvePostAuthPath(input.nextPath),
    siteUrl,
    normalizedStoreSlug,
  );

  if (normalizedStoreSlug) {
    const metadataPhone =
      typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : "";

    if (isValidCustomerPhone(metadataPhone)) {
      try {
        await ensureCustomerProfileAfterAuth(
          supabase,
          user,
          safeNext,
          normalizedStoreSlug,
        );
        if (input.orderId?.trim()) {
          await linkGuestOrdersToCustomer({
            storeSlug: normalizedStoreSlug,
            userId: user.id,
            phone: metadataPhone,
            orderId: input.orderId.trim(),
          });
        }
      } catch {
        // No bloquear login si falla el vínculo cliente.
      }
    } else {
      const registerOrigin =
        isStoreSubdomainCatalogEnabled()
          ? getStoreCatalogOrigin(normalizedStoreSlug)
          : siteUrl;
      let completePath = buildCustomerRegisterPath(normalizedStoreSlug, safeNext);
      completePath += `${completePath.includes("?") ? "&" : "?"}complete=phone`;
      if (input.orderId?.trim()) {
        completePath += `&orderId=${encodeURIComponent(input.orderId.trim())}`;
      }
      return `${registerOrigin}${completePath}`;
    }
  } else {
    try {
      await ensureCustomerProfileAfterAuth(
        supabase,
        user,
        safeNext,
        input.storeSlug,
      );
    } catch {
      // No bloquear login si falla el vínculo cliente.
    }
  }

  return safeNext;
}
