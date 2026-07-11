import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  buildMetaOAuthUrl,
  createMetaOAuthState,
  getMetaRedirectUri,
} from "@/lib/inbox/meta-oauth";
import type { MetaProviderKey } from "@/src/config/channel-integrations";

export const runtime = "nodejs";
export const maxDuration = 15;

const VALID_PROVIDERS = new Set<MetaProviderKey>([
  "whatsapp",
  "instagram",
  "messenger",
]);

export async function GET(request: Request) {
  const appId = process.env.META_APP_ID;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  if (!appId) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/ajustes/integraciones?error=meta_not_configured",
        siteUrl,
      ),
    );
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") as MetaProviderKey | null;

  if (!provider || !VALID_PROVIDERS.has(provider)) {
    return NextResponse.redirect(
      new URL("/dashboard/ajustes/integraciones?error=invalid_provider", siteUrl),
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

  const { state, cookieValue } = createMetaOAuthState({
    storeId: auth.store.id,
    provider,
  });

  const redirectUri = getMetaRedirectUri(siteUrl);
  const oauthUrl = buildMetaOAuthUrl({
    appId,
    redirectUri,
    state,
    provider,
  });

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set("meta_oauth_state", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
