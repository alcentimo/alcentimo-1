import { createHmac, randomBytes } from "node:crypto";
import type { MetaProviderKey } from "@/src/config/channel-integrations";

const GRAPH_API_VERSION = "v21.0";

const PROVIDER_SCOPES: Record<MetaProviderKey, string[]> = {
  whatsapp: [
    "business_management",
    "whatsapp_business_management",
    "whatsapp_business_messaging",
  ],
  instagram: [
    "pages_show_list",
    "pages_messaging",
    "instagram_basic",
    "instagram_manage_messages",
  ],
  messenger: ["pages_show_list", "pages_messaging", "pages_manage_metadata"],
};

export function getMetaRedirectUri(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/api/integrations/meta/callback`;
}

export function createMetaOAuthState(input: {
  storeId: string;
  provider: MetaProviderKey;
}): { state: string; cookieValue: string } {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    throw new Error("META_APP_SECRET not configured");
  }

  const nonce = randomBytes(16).toString("hex");
  const payload = JSON.stringify({
    storeId: input.storeId,
    provider: input.provider,
    nonce,
  });
  const signature = createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  const state = Buffer.from(JSON.stringify({ payload, signature })).toString(
    "base64url",
  );

  return {
    state,
    cookieValue: state,
  };
}

export function parseMetaOAuthState(state: string): {
  storeId: string;
  provider: MetaProviderKey;
} | null {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { payload?: string; signature?: string };

    if (!decoded.payload || !decoded.signature) return null;

    const expected = createHmac("sha256", appSecret)
      .update(decoded.payload)
      .digest("hex");

    if (expected !== decoded.signature) return null;

    const data = JSON.parse(decoded.payload) as {
      storeId?: string;
      provider?: MetaProviderKey;
    };

    if (!data.storeId || !data.provider) return null;

    return { storeId: data.storeId, provider: data.provider };
  } catch {
    return null;
  }
}

export function buildMetaOAuthUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
  provider: MetaProviderKey;
}): string {
  const params = new URLSearchParams({
    client_id: input.appId,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: PROVIDER_SCOPES[input.provider].join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaOAuthCode(input: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Meta app credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: input.redirectUri,
    code: input.code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`,
  );

  const data = (await response.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "No se pudo obtener el token de Meta");
  }

  return { accessToken: data.access_token };
}
