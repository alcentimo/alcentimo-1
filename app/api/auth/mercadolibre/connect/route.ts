import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  buildMlOAuthUrl,
  createMlOAuthState,
  getMlRedirectUri,
} from "@/lib/inbox/mercadolibre-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appId = process.env.ML_APP_ID;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  if (!appId) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/ajustes/integraciones?error=ml_not_configured",
        siteUrl,
      ),
    );
  }

  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/login?next=${encodeURIComponent("/dashboard/ajustes/integraciones")}`,
        siteUrl,
      ),
    );
  }

  const { state, cookieValue } = createMlOAuthState({
    storeId: auth.store.id,
  });

  const redirectUri = getMlRedirectUri(siteUrl);
  const oauthUrl = buildMlOAuthUrl({
    appId,
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set("ml_oauth_state", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
