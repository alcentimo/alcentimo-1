import { createAdminClient } from "@/lib/supabase/admin";
import type { MlIntegrationConfig } from "@/lib/inbox/mercadolibre-oauth";
import { refreshMlAccessToken } from "@/lib/inbox/mercadolibre-oauth";

const ML_API_BASE = "https://api.mercadolibre.com";

/** Renovar el token si faltan menos de 5 minutos para expirar. */
export const ML_TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

type AdminClient = ReturnType<typeof createAdminClient>;

type MlIntegrationLookup =
  | { integrationId: string }
  | { externalAccountId: string };

export interface MlResolvedIntegration {
  id: string;
  store_id: string;
  access_token: string;
  config: MlIntegrationConfig;
}

type MlIntegrationRow = {
  id: string;
  store_id: string;
  config: unknown;
};

export function parseMlConfig(config: unknown): MlIntegrationConfig | null {
  if (!config || typeof config !== "object") return null;

  const c = config as Partial<MlIntegrationConfig>;
  if (
    typeof c.access_token !== "string" ||
    typeof c.refresh_token !== "string" ||
    typeof c.token_expires_at !== "string"
  ) {
    return null;
  }

  return {
    site_id: typeof c.site_id === "string" ? c.site_id : "",
    nickname: typeof c.nickname === "string" ? c.nickname : "",
    scope: typeof c.scope === "string" ? c.scope : "",
    access_token: c.access_token,
    refresh_token: c.refresh_token,
    token_expires_at: c.token_expires_at,
  };
}

export function isMlTokenExpiredOrNearExpiry(
  tokenExpiresAt: string,
  bufferMs: number = ML_TOKEN_EXPIRY_BUFFER_MS,
): boolean {
  const expiresAt = Date.parse(tokenExpiresAt);
  if (Number.isNaN(expiresAt)) return true;
  return Date.now() >= expiresAt - bufferMs;
}

function mergeRefreshedTokens(
  existing: MlIntegrationConfig,
  tokens: Awaited<ReturnType<typeof refreshMlAccessToken>>,
): MlIntegrationConfig {
  return {
    ...existing,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope,
    token_expires_at: new Date(
      Date.now() + tokens.expiresIn * 1000,
    ).toISOString(),
  };
}

async function loadMlIntegration(
  admin: AdminClient,
  lookup: MlIntegrationLookup,
): Promise<MlIntegrationRow | null> {
  let query = admin
    .from("channel_integrations")
    .select("id, store_id, config")
    .eq("provider", "mercadolibre")
    .eq("is_active", true);

  if ("integrationId" in lookup) {
    query = query.eq("id", lookup.integrationId);
  } else {
    query = query.eq("external_account_id", lookup.externalAccountId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[mercadolibre] integration lookup error:", error);
    return null;
  }

  return data;
}

async function persistMlConfig(
  admin: AdminClient,
  integrationId: string,
  config: MlIntegrationConfig,
): Promise<void> {
  const { error } = await admin
    .from("channel_integrations")
    .update({
      config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId);

  if (error) {
    throw error;
  }
}

async function refreshMlIntegrationTokens(
  admin: AdminClient,
  integration: MlIntegrationRow,
  config: MlIntegrationConfig,
): Promise<MlIntegrationConfig | null> {
  try {
    const tokens = await refreshMlAccessToken(config.refresh_token);
    const nextConfig = mergeRefreshedTokens(config, tokens);
    await persistMlConfig(admin, integration.id, nextConfig);
    return nextConfig;
  } catch (err) {
    console.error("[mercadolibre] token refresh failed:", {
      integrationId: integration.id,
      err,
    });
    return null;
  }
}

/**
 * Obtiene un access_token válido para la integración, renovándolo
 * automáticamente si expiró o está próximo a expirar.
 */
export async function resolveMlIntegration(
  lookup: MlIntegrationLookup,
): Promise<MlResolvedIntegration | null> {
  const admin = createAdminClient();
  const integration = await loadMlIntegration(admin, lookup);

  if (!integration) return null;

  let config = parseMlConfig(integration.config);
  if (!config) {
    console.warn(
      "[mercadolibre] invalid or incomplete config for integration:",
      integration.id,
    );
    return null;
  }

  if (isMlTokenExpiredOrNearExpiry(config.token_expires_at)) {
    const refreshed = await refreshMlIntegrationTokens(admin, integration, config);
    if (!refreshed) return null;
    config = refreshed;
  }

  return {
    id: integration.id,
    store_id: integration.store_id,
    access_token: config.access_token,
    config,
  };
}

/**
 * Realiza una petición autenticada a la API de MercadoLibre,
 * asegurando un access_token válido antes de cada llamada.
 */
export async function mlApiFetch(
  lookup: MlIntegrationLookup,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const integration = await resolveMlIntegration(lookup);
  if (!integration) {
    return new Response(null, { status: 401, statusText: "Unauthorized" });
  }

  const url = path.startsWith("http") ? path : `${ML_API_BASE}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${integration.access_token}`);

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const admin = createAdminClient();
    const row = await loadMlIntegration(admin, lookup);
    if (!row) return response;

    const config = parseMlConfig(row.config);
    if (!config) return response;

    const refreshed = await refreshMlIntegrationTokens(admin, row, config);
    if (!refreshed) return response;

    headers.set("Authorization", `Bearer ${refreshed.access_token}`);
    response = await fetch(url, { ...init, headers });
  }

  return response;
}
