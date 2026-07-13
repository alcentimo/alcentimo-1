import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  discoverMetaIntegrationAssets,
  exchangeForLongLivedUserToken,
} from "@/lib/inbox/meta-graph-api";
import {
  exchangeMetaOAuthCode,
  getMetaOAuthStateCookieOptions,
  getMetaRedirectUri,
  META_OAUTH_STATE_COOKIE,
  parseMetaOAuthState,
  resolveMetaOAuthSiteUrl,
} from "@/lib/inbox/meta-oauth";
import { getChannelIntegration } from "@/src/config/channel-integrations";
import { subscribeMetaPageWebhooks } from "@/lib/inbox/meta-page-subscribe";
import {
  getMessengerPageIdFromAssets,
  upsertChannelIntegration,
  upsertChannelIntegrationSecret,
} from "@/lib/inbox/persist-meta-integration";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const siteUrl = resolveMetaOAuthSiteUrl(new URL(request.url).origin);
  const redirectBase = new URL("/dashboard/ajustes/integraciones", siteUrl);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get(META_OAUTH_STATE_COOKIE)?.value;

  const clearCookie = (response: NextResponse) => {
    response.cookies.set(META_OAUTH_STATE_COOKIE, "", {
      ...getMetaOAuthStateCookieOptions(siteUrl, 0),
      maxAge: 0,
    });
    return response;
  };

  if (oauthError) {
    console.warn("[meta/callback] OAuth denied by Meta", {
      error: oauthError,
      redirectUri: getMetaRedirectUri(siteUrl),
    });
    redirectBase.searchParams.set("error", "oauth_denied");
    return clearCookie(NextResponse.redirect(redirectBase));
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    console.warn("[meta/callback] Invalid OAuth state", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookieState: Boolean(cookieState),
      stateMatchesCookie: Boolean(state && cookieState && state === cookieState),
      redirectUri: getMetaRedirectUri(siteUrl),
    });
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

    console.log("[meta/callback] Token exchange OK — discovering Meta assets", {
      provider: parsedState.provider,
      storeId: parsedState.storeId,
    });

    const assets = await discoverMetaIntegrationAssets(
      parsedState.provider,
      accessToken,
    );

    if (!assets) {
      console.warn("[meta/callback] No Meta assets found", {
        provider: parsedState.provider,
        storeId: parsedState.storeId,
      });
      redirectBase.searchParams.set("error", "meta_assets_not_found");
      return clearCookie(NextResponse.redirect(redirectBase));
    }

    if (assets.config.fallback_from_provider) {
      console.log("[meta/callback] Connected via Facebook Page fallback", {
        requestedProvider: parsedState.provider,
        pageId: assets.externalAccountId,
      });
    }

    const admin = createAdminClient();
    const channel = getChannelIntegration(parsedState.provider);

    const persisted = await upsertChannelIntegration(admin, {
      storeId: parsedState.storeId,
      provider: parsedState.provider,
      assets,
      displayNameFallback: channel.label,
    });

    await upsertChannelIntegrationSecret(
      admin,
      persisted.id,
      assets.accessToken,
    );

    const messengerPageId = getMessengerPageIdFromAssets(assets);
    if (messengerPageId && parsedState.provider !== "messenger") {
      const messengerRow = await upsertChannelIntegration(admin, {
        storeId: parsedState.storeId,
        provider: "messenger",
        assets,
        displayNameFallback: getChannelIntegration("messenger").label,
      });
      await upsertChannelIntegrationSecret(
        admin,
        messengerRow.id,
        assets.accessToken,
      );
      console.log("[meta/callback] Messenger row synced for Facebook Page", {
        messengerIntegrationId: messengerRow.id,
        pageId: messengerPageId,
        requestedProvider: parsedState.provider,
      });
    }

    console.log("[meta/callback] Integration saved", {
      provider: parsedState.provider,
      storeId: parsedState.storeId,
      integrationId: persisted.id,
      externalAccountId: persisted.external_account_id,
      messengerPageId,
    });

    if (messengerPageId) {
      const subscribeResult = await subscribeMetaPageWebhooks(
        messengerPageId,
        assets.accessToken,
      );
      console.log("[meta/callback] Page webhook subscription result", {
        pageName: assets.displayName,
        ...subscribeResult,
      });
    }

    redirectBase.searchParams.set("connected", parsedState.provider);
    return clearCookie(NextResponse.redirect(redirectBase));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[integrations/meta/callback]", message, err);
    redirectBase.searchParams.set("error", "connect_failed");
    redirectBase.searchParams.set("detail", message.slice(0, 200));
    return clearCookie(NextResponse.redirect(redirectBase));
  }
}
