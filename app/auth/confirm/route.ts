import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site-url";

const RESET_PASSWORD_PATH = "/dashboard/restablecer-contrasena";

/**
 * Confirma enlaces de email (recuperación, signup) en el servidor.
 * verifyOtp(token_hash) no requiere PKCE verifier — ideal para links desde el correo.
 * exchangeCodeForSession(code) usa cookies del request donde se guardó el verifier.
 */
export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrl();
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? RESET_PASSWORD_PATH;

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : RESET_PASSWORD_PATH;

  let supabaseResponse = NextResponse.redirect(`${siteUrl}${safeNext}`);

  const { url, anonKey } = requireSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return supabaseResponse;
    }

    return NextResponse.redirect(
      `${siteUrl}/dashboard/recuperar-contrasena?error=${encodeURIComponent(error.message)}`,
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return supabaseResponse;
    }

    const pkceHint =
      error.message.toLowerCase().includes("code verifier")
        ? " Abre el enlace en el mismo navegador donde solicitaste la recuperación, o solicita un nuevo enlace."
        : "";

    return NextResponse.redirect(
      `${siteUrl}/dashboard/recuperar-contrasena?error=${encodeURIComponent(error.message + pkceHint)}`,
    );
  }

  return NextResponse.redirect(
    `${siteUrl}/dashboard/recuperar-contrasena?error=${encodeURIComponent("Enlace de confirmación inválido.")}`,
  );
}
