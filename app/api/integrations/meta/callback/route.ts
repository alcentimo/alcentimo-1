import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  discoverMetaIntegrationAssets,
  exchangeForLongLivedUserToken,
} from "@/lib/inbox/meta-graph-api";
import {
  exchangeMetaOAuthCode,
  getMetaRedirectUri,
  parseMetaOAuthState,
} from "@/lib/inbox/meta-oauth";
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
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("meta_oauth_state")?.value;

  const clearCookie = (response: NextResponse) => {
    response.cookies.set("meta_oauth_state", "", {
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

  const parsedState = parseMetaOAuthState(state);
  if (!parsedState) {
    redirectBase.searchParams.set("error", "invalid_state");
    return clearCookie(NextResponse.redirect(redirectBase));
  }

  try {
    const redirectUri = getMetaRedirectUri(siteUrl);
    const { accessToken: shortLivedToken } = await exchangeMetaOAuthCode({
      code,
      redirectUri,
    });
    const accessToken = await exchangeForLongLivedUserToken(shortLivedToken);
    const assets = await discoverMetaIntegrationAssets(
      parsedState.provider,
      accessToken,
    );

    if (!assets) {
      redirectBase.searchParams.set("error", "meta_assets_not_found");
      return clearCookie(NextResponse.redirect(redirectBase));
    }

    const admin = createAdminClient();
    const channel = getChannelIntegration(parsedState.provider);

    const { data: existing } = await admin
      .from("channel_integrations")
      .select("id, external_account_id")
      .eq("store_id", parsedState.storeId)
      .eq("provider", parsedState.provider)
      .maybeSingle();

    let integrationId = existing?.id;

    const integrationPatch = {
      external_account_id: assets.externalAccountId,
      display_name: assets.displayName ?? channel.label,
      config: assets.config,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (integrationId) {
      const { error: updateError } = await admin
        .from("channel_integrations")
        .update(integrationPatch)
        .eq("id", integrationId);

      if (updateError) {
        if (updateError.code === "23505") {
          const { data: conflict } = await admin
            .from("channel_integrations")
            .select("id")
            .eq("store_id", parsedState.storeId)
            .eq("provider", parsedState.provider)
            .eq("external_account_id", assets.externalAccountId)
            .maybeSingle();

          if (conflict?.id) {
            integrationId = conflict.id;
            await admin
              .from("channel_integrations")
              .update(integrationPatch)
              .eq("id", integrationId);
          } else {
            throw updateError;
          }
        } else {
          throw updateError;
        }
      }
    } else {
      const { data: created, error: createError } = await admin
        .from("channel_integrations")
        .insert({
          store_id: parsedState.storeId,
          provider: parsedState.provider,
          ...integrationPatch,
        })
        .select("id")
        .single();

      if (createError || !created) {
        throw createError ?? new Error("Failed to create integration");
      }

      integrationId = created.id;
    }

    await admin.from("channel_integration_secrets").upsert({
      integration_id: integrationId,
      access_token: assets.accessToken,
      updated_at: new Date().toISOString(),
    });

    redirectBase.searchParams.set("connected", parsedState.provider);
    return clearCookie(NextResponse.redirect(redirectBase));
  } catch (err) {
    console.error("[integrations/meta/callback]", err);
    redirectBase.searchParams.set("error", "connect_failed");
    return clearCookie(NextResponse.redirect(redirectBase));
  }
}
