import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { ensureCustomerProfileAfterAuth } from "@/lib/customers/ensure-customer-profile";
import { isValidCustomerPhone } from "@/lib/customers/phone-auth";
import { linkGuestOrdersToCustomer } from "@/lib/orders/link-guest-orders";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

function resolveAuthRedirectTarget(next: string, siteUrl: string): string {
  if (next.startsWith("http://") || next.startsWith("https://")) {
    return next;
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
  const safeNext = resolveAuthRedirectTarget(
    resolvePostAuthPath(input.nextPath),
    siteUrl,
  );
  const normalizedStoreSlug = input.storeSlug?.trim().toLowerCase() || null;

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
      const completeUrl = new URL(`${siteUrl}/register`);
      completeUrl.searchParams.set("store", normalizedStoreSlug);
      completeUrl.searchParams.set("next", safeNext);
      completeUrl.searchParams.set("complete", "phone");
      if (input.orderId?.trim()) {
        completeUrl.searchParams.set("orderId", input.orderId.trim());
      }
      return completeUrl.toString();
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
