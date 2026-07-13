import type { MetaProviderKey } from "@/src/config/channel-integrations";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface GraphErrorBody {
  error?: { message?: string; code?: number; type?: string };
}

export interface MetaDiscoveredAssets {
  externalAccountId: string;
  displayName: string | null;
  config: Record<string, unknown>;
  /** Token recomendado para API calls (usuario o página según canal). */
  accessToken: string;
}

interface GraphFetchResult<T> {
  ok: boolean;
  status: number;
  data: T & GraphErrorBody;
  path: string;
}

async function graphGet<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const result = await graphGetSafe<T>(path, accessToken, params);
  if (!result.ok) {
    throw new Error(
      result.data.error?.message ?? `Meta Graph API error (${result.status})`,
    );
  }
  return result.data;
}

/** Fetch sin lanzar excepción — útil para descubrimiento con múltiples endpoints. */
async function graphGetSafe<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<GraphFetchResult<T>> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const data = (await response.json()) as T & GraphErrorBody;

  return {
    ok: response.ok,
    status: response.status,
    data,
    path,
  };
}

function redactToken(value: string): string {
  if (value.length <= 12) return "***";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function sanitizeForLog(payload: unknown): unknown {
  if (payload == null) return payload;
  if (Array.isArray(payload)) {
    return payload.map(sanitizeForLog);
  }
  if (typeof payload !== "object") return payload;

  const record = payload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "access_token" && typeof value === "string") {
      sanitized[key] = redactToken(value);
      continue;
    }
    if (typeof value === "object") {
      sanitized[key] = sanitizeForLog(value);
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

/** Intercambia un token de corta duración por uno de larga duración (~60 días). */
export async function exchangeForLongLivedUserToken(
  shortLivedToken: string,
): Promise<string> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Meta app credentials not configured");
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${GRAPH_BASE}/oauth/access_token?${params.toString()}`,
  );
  const data = (await response.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error?.message ?? "No se pudo obtener el token de larga duración",
    );
  }

  return data.access_token;
}

interface WhatsAppPhoneNumber {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
}

interface WhatsAppBusinessAccount {
  id?: string;
  name?: string;
  phone_numbers?: { data?: WhatsAppPhoneNumber[] };
}

interface BusinessNode {
  id?: string;
  name?: string;
  owned_whatsapp_business_accounts?: { data?: WhatsAppBusinessAccount[] };
}

async function discoverWhatsAppAssets(
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  const result = await graphGetSafe<{ data?: BusinessNode[] }>(
    "/me/businesses",
    accessToken,
    {
      fields:
        "id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}",
    },
  );

  if (!result.ok) {
    console.warn("[meta/discovery] WhatsApp lookup skipped", {
      status: result.status,
      error: result.data.error ?? null,
    });
    return null;
  }

  for (const business of result.data.data ?? []) {
    for (const waba of business.owned_whatsapp_business_accounts?.data ?? []) {
      const phone = waba.phone_numbers?.data?.[0];
      if (!phone?.id) continue;

      return {
        externalAccountId: phone.id,
        displayName:
          phone.verified_name ??
          phone.display_phone_number ??
          waba.name ??
          business.name ??
          null,
        config: {
          business_id: business.id,
          business_name: business.name,
          waba_id: waba.id,
          waba_name: waba.name,
          phone_number_id: phone.id,
          display_phone_number: phone.display_phone_number ?? null,
          verified_name: phone.verified_name ?? null,
          linked_via: "whatsapp",
        },
        accessToken,
      };
    }
  }

  return null;
}

interface PageAccount {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
  };
}

interface BusinessWithPages {
  id?: string;
  name?: string;
  owned_pages?: { data?: PageAccount[] };
  client_pages?: { data?: PageAccount[] };
}

export interface MetaPageDiscoverySnapshot {
  meAccounts: GraphFetchResult<{ data?: PageAccount[] }>;
  meAccountsNested: GraphFetchResult<{
    accounts?: { data?: PageAccount[] };
  }>;
  meBusinesses: GraphFetchResult<{ data?: BusinessWithPages[] }>;
  normalizedPages: PageAccount[];
}

function pageKey(page: PageAccount): string | null {
  const id = page.id?.trim();
  if (id) return id;
  const name = page.name?.trim();
  return name ? `name:${name}` : null;
}

function isPageLike(value: unknown): value is PageAccount {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const hasId = typeof record.id === "string" && record.id.trim().length > 0;
  const hasName = typeof record.name === "string" && record.name.trim().length > 0;
  return hasId || hasName;
}

/** Extrae páginas de estructuras variables que devuelve Graph API. */
function extractPagesFromPayload(payload: unknown, depth = 0): PageAccount[] {
  if (payload == null || depth > 6) return [];

  if (Array.isArray(payload)) {
    const pages: PageAccount[] = [];
    for (const item of payload) {
      if (isPageLike(item)) {
        pages.push(item);
      }
      pages.push(...extractPagesFromPayload(item, depth + 1));
    }
    return pages;
  }

  if (typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const pages: PageAccount[] = [];

  for (const key of ["data", "accounts", "pages", "owned_pages", "client_pages"]) {
    if (key in record) {
      pages.push(...extractPagesFromPayload(record[key], depth + 1));
    }
  }

  if (isPageLike(record)) {
    pages.push(record);
  }

  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      pages.push(...extractPagesFromPayload(value, depth + 1));
    }
  }

  return pages;
}

function mergePages(...groups: PageAccount[][]): PageAccount[] {
  const seen = new Set<string>();
  const merged: PageAccount[] = [];

  for (const group of groups) {
    for (const page of group) {
      const key = pageKey(page);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(page);
    }
  }

  return merged;
}

function buildFacebookPageAssets(
  page: PageAccount,
  userAccessToken: string,
): MetaDiscoveredAssets | null {
  const pageId = page.id?.trim();
  const pageName = page.name?.trim() ?? null;
  const pageAccessToken = page.access_token?.trim();

  if (!pageId && !pageName) return null;

  return {
    externalAccountId: pageId ?? `page-name:${pageName}`,
    displayName: pageName,
    config: {
      page_id: pageId ?? null,
      page_name: pageName,
      linked_via: "facebook_page",
      token_type: pageAccessToken ? "PAGE" : "USER",
    },
    accessToken: pageAccessToken || userAccessToken,
  };
}

export interface MetaPageAccessCredentials {
  pageId: string;
  pageName: string | null;
  pageAccessToken: string;
  source: "me/accounts" | "discovery";
}

async function getMetaUserId(userAccessToken: string): Promise<string | null> {
  const result = await graphGetSafe<{ id?: string }>("/me", userAccessToken, {
    fields: "id",
  });

  if (!result.ok) {
    return null;
  }

  return result.data.id?.trim() ?? null;
}

/**
 * Obtiene el Page Access Token desde /me/accounts para la página indicada.
 * subscribed_apps requiere token de PÁGINA, no el token de usuario.
 */
export async function resolvePageAccessTokenFromAccounts(
  userAccessToken: string,
  preferredPageId?: string | null,
): Promise<MetaPageAccessCredentials | null> {
  const normalizedPreferredPageId = preferredPageId?.trim() || null;
  const metaUserId = await getMetaUserId(userAccessToken);
  const safePreferredPageId =
    normalizedPreferredPageId && normalizedPreferredPageId !== metaUserId
      ? normalizedPreferredPageId
      : null;

  const meAccounts = await graphGetSafe<{ data?: PageAccount[] }>(
    "/me/accounts",
    userAccessToken,
    { fields: "id,name,access_token" },
  );

  console.log("[meta/page-token] /me/accounts", {
    ok: meAccounts.ok,
    status: meAccounts.status,
    metaUserId,
    preferredPageId: normalizedPreferredPageId,
    safePreferredPageId,
    pageCount: meAccounts.data.data?.length ?? 0,
    pages: (meAccounts.data.data ?? []).map((page) => ({
      id: page.id ?? null,
      name: page.name ?? null,
      hasPageToken: Boolean(page.access_token?.trim()),
    })),
    error: meAccounts.data.error ?? null,
  });

  let pagesWithToken = (meAccounts.data.data ?? []).filter(
    (page) =>
      page.id?.trim() &&
      page.access_token?.trim() &&
      page.id.trim() !== metaUserId,
  );

  if (pagesWithToken.length === 0) {
    pagesWithToken = (await listAllAuthorizedPages(userAccessToken)).filter(
      (page) =>
        page.id?.trim() &&
        page.access_token?.trim() &&
        page.id.trim() !== metaUserId,
    );
  }

  if (pagesWithToken.length === 0) {
    console.warn("[meta/page-token] No pages with access_token found", {
      preferredPageId: normalizedPreferredPageId,
      metaUserId,
    });
    return null;
  }

  const selected =
    (safePreferredPageId
      ? pagesWithToken.find((page) => page.id?.trim() === safePreferredPageId)
      : null) ?? pagesWithToken[0];

  const pageId = selected.id?.trim();
  const pageAccessToken = selected.access_token?.trim();

  if (!pageId || !pageAccessToken) {
    return null;
  }

  return {
    pageId,
    pageName: selected.name?.trim() ?? null,
    pageAccessToken,
    source: meAccounts.ok ? "me/accounts" : "discovery",
  };
}

/**
 * Aplica credenciales de página sobre los activos descubiertos (token + page_id).
 */
export function applyPageAccessCredentialsToAssets(
  assets: MetaDiscoveredAssets,
  credentials: MetaPageAccessCredentials,
): MetaDiscoveredAssets {
  return {
    ...assets,
    externalAccountId: credentials.pageId,
    displayName: credentials.pageName ?? assets.displayName,
    accessToken: credentials.pageAccessToken,
    config: {
      ...assets.config,
      page_id: credentials.pageId,
      page_name: credentials.pageName ?? assets.config.page_name ?? null,
      token_type: "PAGE",
      page_token_source: credentials.source,
    },
  };
}

/**
 * Consulta varios endpoints y registra la respuesta cruda antes de validar.
 */
export async function inspectMetaPageDiscovery(
  accessToken: string,
): Promise<MetaPageDiscoverySnapshot> {
  const meAccounts = await graphGetSafe<{ data?: PageAccount[] }>(
    "/me/accounts",
    accessToken,
    {
      fields: "id,name,access_token,instagram_business_account{id,username}",
    },
  );

  const meAccountsNested = await graphGetSafe<{
    accounts?: { data?: PageAccount[] };
  }>("/me", accessToken, {
    fields: "id,name,accounts{id,name,access_token}",
  });

  const meBusinesses = await graphGetSafe<{ data?: BusinessWithPages[] }>(
    "/me/businesses",
    accessToken,
    {
      fields:
        "id,name,owned_pages{id,name,access_token},client_pages{id,name,access_token}",
    },
  );

  const normalizedPages = mergePages(
    extractPagesFromPayload(meAccounts.data),
    extractPagesFromPayload(meAccountsNested.data),
    extractPagesFromPayload(meBusinesses.data),
  );

  console.log("[meta/discovery] Raw Meta page discovery snapshot", {
    meAccounts: {
      ok: meAccounts.ok,
      status: meAccounts.status,
      error: meAccounts.data.error ?? null,
      body: sanitizeForLog(meAccounts.data),
    },
    meAccountsNested: {
      ok: meAccountsNested.ok,
      status: meAccountsNested.status,
      error: meAccountsNested.data.error ?? null,
      body: sanitizeForLog(meAccountsNested.data),
    },
    meBusinesses: {
      ok: meBusinesses.ok,
      status: meBusinesses.status,
      error: meBusinesses.data.error ?? null,
      body: sanitizeForLog(meBusinesses.data),
    },
    normalizedPageCount: normalizedPages.length,
    normalizedPages: normalizedPages.map((page) => ({
      id: page.id ?? null,
      name: page.name ?? null,
      hasPageToken: Boolean(page.access_token),
    })),
  });

  return {
    meAccounts,
    meAccountsNested,
    meBusinesses,
    normalizedPages,
  };
}

/** Lista páginas autorizadas con parsing flexible. */
async function listAllAuthorizedPages(accessToken: string): Promise<PageAccount[]> {
  const snapshot = await inspectMetaPageDiscovery(accessToken);
  return snapshot.normalizedPages;
}

/**
 * Acepta la conexión si Meta devolvió al menos una Página de Facebook autorizada.
 * No requiere WhatsApp ni Instagram.
 */
export async function discoverFacebookPageAssets(
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  const pages = await listAllAuthorizedPages(accessToken);
  const page =
    pages.find((candidate) => candidate.id?.trim() && candidate.access_token?.trim()) ??
    pages.find((candidate) => candidate.id?.trim()) ??
    pages.find((candidate) => candidate.name?.trim());

  if (!page) return null;

  return buildFacebookPageAssets(page, accessToken);
}

async function listManagedPages(accessToken: string): Promise<PageAccount[]> {
  return listAllAuthorizedPages(accessToken);
}

async function discoverMessengerAssets(
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  return discoverFacebookPageAssets(accessToken);
}

async function discoverInstagramAssets(
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  const pages = await listManagedPages(accessToken);

  for (const page of pages) {
    const igAccount = page.instagram_business_account;
    if (!igAccount?.id) continue;

    return {
      externalAccountId: igAccount.id,
      displayName: igAccount.username
        ? `@${igAccount.username}`
        : (page.name ?? null),
      config: {
        page_id: page.id,
        page_name: page.name ?? null,
        ig_user_id: igAccount.id,
        ig_username: igAccount.username ?? null,
      },
      accessToken: page.access_token ?? accessToken,
    };
  }

  return null;
}

/**
 * Descubre activos tras OAuth. Prioriza cualquier Página de Facebook autorizada;
 * WhatsApp e Instagram son opcionales.
 */
export async function discoverMetaIntegrationAssets(
  provider: MetaProviderKey,
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  console.log("[meta/discovery] Starting asset discovery", { provider });

  const pageAssets = await discoverFacebookPageAssets(accessToken);
  if (pageAssets) {
    console.log("[meta/discovery] Facebook Page accepted", {
      provider,
      pageId: pageAssets.externalAccountId,
      pageName: pageAssets.displayName,
    });

    if (provider === "messenger") {
      return pageAssets;
    }

    return {
      ...pageAssets,
      config: {
        ...pageAssets.config,
        requested_provider: provider,
        fallback_from_provider: provider,
      },
    };
  }

  let providerAssets: MetaDiscoveredAssets | null = null;

  switch (provider) {
    case "whatsapp":
      providerAssets = await discoverWhatsAppAssets(accessToken);
      break;
    case "instagram":
      providerAssets = await discoverInstagramAssets(accessToken);
      break;
    case "messenger":
      providerAssets = null;
      break;
    default:
      providerAssets = null;
  }

  if (providerAssets) {
    console.log("[meta/discovery] Provider-specific asset accepted", {
      provider,
      externalAccountId: providerAssets.externalAccountId,
    });
    return providerAssets;
  }

  console.warn("[meta/discovery] No pages or provider assets found", { provider });
  return null;
}
