import { NextResponse } from "next/server";
import { finalizeAuthSessionRedirect } from "@/lib/auth/finalize-auth-session";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const siteUrl = getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";
  const storeSlug = searchParams.get("store");
  const orderId = searchParams.get("orderId");

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
    const redirectTo = await finalizeAuthSessionRedirect(supabase, {
      nextPath: next,
      storeSlug,
      orderId,
    });
    return NextResponse.redirect(redirectTo);
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/dashboard/login?error=${encodeURIComponent("No se pudo verificar la sesión.")}`,
    );
  }
}
