import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { isConfiguredEnvValue } from "@/lib/env/server";
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

function previewEnvValue(value: string): string {
  if (!value) return "(vacío)";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export async function GET(request: Request) {
  const rawMetaAppId = process.env.META_APP_ID?.trim() ?? "";
  const rawMetaAppSecret = process.env.META_APP_SECRET?.trim() ?? "";
  const appId = isConfiguredEnvValue(rawMetaAppId) ? rawMetaAppId : undefined;

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") as MetaProviderKey | null;

  // Diagnóstico temporal — revisar en Vercel → Logs al hacer clic en Conectar.
  console.log("[meta/connect] OAuth env diagnostic", {
    vercelEnv: process.env.VERCEL_ENV ?? "local",
    provider,
    metaAppIdRaw: previewEnvValue(rawMetaAppId),
    metaAppIdLength: rawMetaAppId.length,
    metaAppIdIsPlaceholder: rawMetaAppId === "pending-configuration",
    metaAppSecretPresent: Boolean(rawMetaAppSecret),
    metaAppSecretIsPlaceholder: rawMetaAppSecret === "pending-configuration",
    clientIdUsed: appId ? previewEnvValue(appId) : "(bloqueado)",
    willRedirectToFacebook: Boolean(appId && isConfiguredEnvValue(rawMetaAppSecret)),
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  if (!appId || !isConfiguredEnvValue(rawMetaAppSecret)) {
    console.warn(
      "[meta/connect] Meta OAuth bloqueado — configure META_APP_ID y META_APP_SECRET reales en Vercel (no pending-configuration).",
    );
    return NextResponse.redirect(
      new URL(
        "/dashboard/ajustes/integraciones?error=meta_not_configured",
        siteUrl,
      ),
    );
  }

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

  console.log("[meta/connect] Redirecting to Meta OAuth", {
    clientId: previewEnvValue(appId),
    redirectUri,
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
