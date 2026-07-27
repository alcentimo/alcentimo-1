import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  resolveAuthConfirmErrorPath,
  resolveAuthConfirmNext,
} from "@/lib/auth/resolve-auth-confirm-next";
import { requireSupabasePublicEnv } from "@/lib/supabase/config";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Confirma enlaces de email (registro, recuperación, magic link) en el servidor.
 * verifyOtp(token_hash) no requiere PKCE verifier — ideal para links desde el correo.
 */
export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrl();
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  const safeNext = resolveAuthConfirmNext(type, nextParam);
  const errorPath = resolveAuthConfirmErrorPath(type);

  let supabaseResponse = NextResponse.redirect(`${siteUrl}${safeNext}`);

  const { url, anonKey } = requireSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(),
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

    const verifyUrl = new URL(`${siteUrl}${errorPath}`);
    verifyUrl.searchParams.set("error", error.message);
    if (type === "signup" || type === "invite") {
      verifyUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(verifyUrl.toString());
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

    const verifyUrl = new URL(`${siteUrl}${errorPath}`);
    verifyUrl.searchParams.set(
      "error",
      `${error.message}${pkceHint}`.trim(),
    );
    if (type === "signup" || type === "invite") {
      verifyUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(verifyUrl.toString());
  }

  const verifyUrl = new URL(`${siteUrl}${errorPath}`);
  verifyUrl.searchParams.set("error", "Enlace de confirmación inválido.");
  return NextResponse.redirect(verifyUrl.toString());
}
