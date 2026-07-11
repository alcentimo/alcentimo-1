import { createHmac, randomBytes } from "node:crypto";

const ML_API_BASE = "https://api.mercadolibre.com";

/** Scopes válidos en MercadoLibre: read, write, offline_access */
export const ML_OAUTH_SCOPES = ["read", "write", "offline_access"] as const;

export function getMlSiteTld(): string {
  return process.env.ML_SITE_TLD ?? "com.ve";
}

export function getMlRedirectUri(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/api/auth/mercadolibre/callback`;
}

export function getMlAuthBaseUrl(): string {
  return `https://auth.mercadolibre.${getMlSiteTld()}`;
}

export function createMlOAuthState(input: {
  storeId: string;
}): { state: string; cookieValue: string } {
  const appSecret = process.env.ML_APP_SECRET;
  if (!appSecret) {
    throw new Error("ML_APP_SECRET not configured");
  }

  const nonce = randomBytes(16).toString("hex");
  const payload = JSON.stringify({
    storeId: input.storeId,
    nonce,
  });
  const signature = createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  const state = Buffer.from(JSON.stringify({ payload, signature })).toString(
    "base64url",
  );

  return { state, cookieValue: state };
}

export function parseMlOAuthState(state: string): { storeId: string } | null {
  const appSecret = process.env.ML_APP_SECRET;
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

    const data = JSON.parse(decoded.payload) as { storeId?: string };
    if (!data.storeId) return null;

    return { storeId: data.storeId };
  } catch {
    return null;
  }
}

export function buildMlOAuthUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.appId,
    redirect_uri: input.redirectUri,
    state: input.state,
  });

  return `${getMlAuthBaseUrl()}/authorization?${params.toString()}`;
}

export interface MlTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: number;
  scope: string;
}

export async function exchangeMlOAuthCode(input: {
  code: string;
  redirectUri: string;
}): Promise<MlTokenResponse> {
  const appId = process.env.ML_APP_ID;
  const appSecret = process.env.ML_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("MercadoLibre app credentials not configured");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: appId,
    client_secret: appSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
  });

  const response = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user_id?: number;
    scope?: string;
    message?: string;
    error?: string;
  };

  if (
    !response.ok ||
    !data.access_token ||
    !data.refresh_token ||
    !data.user_id
  ) {
    throw new Error(
      data.message ?? data.error ?? "No se pudo obtener el token de MercadoLibre",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 21_600,
    userId: data.user_id,
    scope: data.scope ?? ML_OAUTH_SCOPES.join(" "),
  };
}

export async function refreshMlAccessToken(
  refreshToken: string,
): Promise<MlTokenResponse> {
  const appId = process.env.ML_APP_ID;
  const appSecret = process.env.ML_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("MercadoLibre app credentials not configured");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: appId,
    client_secret: appSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user_id?: number;
    scope?: string;
    message?: string;
    error?: string;
  };

  if (
    !response.ok ||
    !data.access_token ||
    !data.refresh_token ||
    !data.user_id
  ) {
    throw new Error(
      data.message ?? data.error ?? "No se pudo renovar el token de MercadoLibre",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 21_600,
    userId: data.user_id,
    scope: data.scope ?? ML_OAUTH_SCOPES.join(" "),
  };
}

export interface MlUserProfile {
  id: number;
  nickname: string;
  site_id: string;
}

export interface MlIntegrationConfig {
  site_id: string;
  nickname: string;
  scope: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

export function buildMlIntegrationConfig(input: {
  profile: MlUserProfile;
  tokens: MlTokenResponse;
}): MlIntegrationConfig {
  return {
    site_id: input.profile.site_id,
    nickname: input.profile.nickname,
    scope: input.tokens.scope,
    access_token: input.tokens.accessToken,
    refresh_token: input.tokens.refreshToken,
    token_expires_at: new Date(
      Date.now() + input.tokens.expiresIn * 1000,
    ).toISOString(),
  };
}

export async function fetchMlUserProfile(
  accessToken: string,
): Promise<MlUserProfile> {
  const response = await fetch(`${ML_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await response.json()) as {
    id?: number;
    nickname?: string;
    site_id?: string;
    message?: string;
  };

  if (!response.ok || !data.id) {
    throw new Error(data.message ?? "No se pudo obtener el perfil de MercadoLibre");
  }

  return {
    id: data.id,
    nickname: data.nickname ?? String(data.id),
    site_id: data.site_id ?? "",
  };
}
