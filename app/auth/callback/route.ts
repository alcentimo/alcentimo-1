import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const siteUrl = getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

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

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";

  return NextResponse.redirect(`${siteUrl}${safeNext}`);
}
