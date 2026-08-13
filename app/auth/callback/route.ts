import { NextResponse } from "next/server";
import { finalizeAuthSessionRedirect } from "@/lib/auth/finalize-auth-session";
import { logAuthEvent } from "@/lib/auth/auth-log";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

function loginErrorRedirect(siteUrl: string, code: string, detail?: string) {
  const params = new URLSearchParams();
  params.set("error", code);
  if (detail?.trim()) {
    params.set("error_description", detail.trim().slice(0, 180));
  }
  return NextResponse.redirect(`${siteUrl}/dashboard/login?${params.toString()}`);
}

export async function GET(request: Request) {
  const siteUrl = getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? DEFAULT_POST_AUTH_PATH;
  const storeSlug = searchParams.get("store");
  const orderId = searchParams.get("orderId");

  if (!code) {
    logAuthEvent(
      "callback_missing_code",
      { next, storeSlug: storeSlug ?? null },
      "warn",
    );
    return loginErrorRedirect(siteUrl, "auth_callback_missing_code");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logAuthEvent(
      "callback_exchange_failed",
      {
        message: error.message,
        status: error.status ?? null,
        next,
        storeSlug: storeSlug ?? null,
      },
      "error",
    );
    return loginErrorRedirect(
      siteUrl,
      "auth_callback_exchange_failed",
      error.message,
    );
  }

  try {
    const redirectTo = await finalizeAuthSessionRedirect(supabase, {
      nextPath: next,
      storeSlug,
      orderId,
    });
    logAuthEvent("callback_success", {
      next,
      storeSlug: storeSlug ?? null,
    });
    return NextResponse.redirect(redirectTo);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "No se pudo verificar la sesión.";
    logAuthEvent(
      "callback_session_verify_failed",
      { message, next, storeSlug: storeSlug ?? null },
      "error",
    );
    return loginErrorRedirect(siteUrl, "auth_session_verify_failed", message);
  }
}
