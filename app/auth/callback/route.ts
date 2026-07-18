import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { ensureCustomerProfileAfterAuth } from "@/lib/customers/ensure-customer-profile";
import { isValidCustomerPhone } from "@/lib/customers/phone-auth";
import { getSiteUrl } from "@/lib/site-url";

function resolveAuthRedirectTarget(next: string, siteUrl: string): string {
  if (next.startsWith("http://") || next.startsWith("https://")) {
    return next;
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  return `${siteUrl}${safeNext}`;
}

export async function GET(request: Request) {
  const siteUrl = getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";
  const storeSlug = searchParams.get("store");

  if (!code) {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/login?error=auth_callback_missing_code`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  try {
    await ensureUserProfile(supabase);
  } catch {
    // El trigger handle_new_user_profile suele crear el perfil; no bloquear el login.
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const safeNext = resolveAuthRedirectTarget(next, siteUrl);
    const normalizedStoreSlug = storeSlug?.trim().toLowerCase() || null;

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
        } catch {
          // No bloquear login si falla el vínculo cliente; /register puede reintentar.
        }
      } else {
        const completeUrl = new URL(`${siteUrl}/register`);
        completeUrl.searchParams.set("store", normalizedStoreSlug);
        completeUrl.searchParams.set("next", safeNext);
        completeUrl.searchParams.set("complete", "phone");
        return NextResponse.redirect(completeUrl.toString());
      }
    } else {
      try {
        await ensureCustomerProfileAfterAuth(supabase, user, safeNext, storeSlug);
      } catch {
        // No bloquear login si falla el vínculo cliente; /register puede reintentar.
      }
    }

    return NextResponse.redirect(safeNext);
  }

  const safeNext = resolveAuthRedirectTarget(next, siteUrl);

  return NextResponse.redirect(safeNext);
}
