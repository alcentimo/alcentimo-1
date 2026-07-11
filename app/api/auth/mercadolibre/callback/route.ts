import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildMlIntegrationConfig,
  exchangeMlOAuthCode,
  fetchMlUserProfile,
  getMlRedirectUri,
  parseMlOAuthState,
} from "@/lib/inbox/mercadolibre-oauth";
import { getChannelIntegration } from "@/src/config/channel-integrations";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const redirectBase = new URL("/dashboard/ajustes/integraciones", siteUrl);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("ml_oauth_state")?.value;

  const clearCookie = (response: NextResponse) => {
    response.cookies.set("ml_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  };

  if (oauthError) {
    redirectBase.searchParams.set("error", "oauth_denied");
    return clearCookie(NextResponse.redirect(redirectBase));
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    redirectBase.searchParams.set("error", "invalid_state");
    return clearCookie(NextResponse.redirect(redirectBase));
  }

  const parsedState = parseMlOAuthState(state);
  if (!parsedState) {
    redirectBase.searchParams.set("error", "invalid_state");
    return clearCookie(NextResponse.redirect(redirectBase));
  }

  try {
    const redirectUri = getMlRedirectUri(siteUrl);
    const tokens = await exchangeMlOAuthCode({ code, redirectUri });
    const profile = await fetchMlUserProfile(tokens.accessToken);
    const admin = createAdminClient();
    const channel = getChannelIntegration("mercadolibre");
    const externalAccountId = String(profile.id);
    const config = buildMlIntegrationConfig({ profile, tokens });

    const { data: existing } = await admin
      .from("channel_integrations")
      .select("id")
      .eq("store_id", parsedState.storeId)
      .eq("provider", "mercadolibre")
      .eq("external_account_id", externalAccountId)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("channel_integrations")
        .update({
          is_active: true,
          display_name: profile.nickname || channel.label,
          config,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: createError } = await admin
        .from("channel_integrations")
        .insert({
          store_id: parsedState.storeId,
          provider: "mercadolibre",
          external_account_id: externalAccountId,
          display_name: profile.nickname || channel.label,
          config,
          is_active: true,
        });

      if (createError) throw createError;
    }

    redirectBase.searchParams.set("connected", "mercadolibre");
    return clearCookie(NextResponse.redirect(redirectBase));
  } catch (err) {
    console.error("[auth/mercadolibre/callback]", err);
    redirectBase.searchParams.set("error", "ml_connect_failed");
    return clearCookie(NextResponse.redirect(redirectBase));
  }
}
